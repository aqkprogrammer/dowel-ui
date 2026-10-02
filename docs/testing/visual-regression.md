# Visual regression testing

The unit tests run in jsdom, which never paints. They can check what a
component puts in the DOM, not what it looks like. So a change to a token, to
Tailwind or to a shared style can alter every component on the page with every
test still passing. This check takes a screenshot of every Storybook story and
compares it with the same story on the base branch.

## What it checks

`packages/visual-tests` reads `index.json` from a built Storybook and makes one
Playwright test per story (docs pages are skipped: they are the same stories
again). Each test opens the story on its own, at
`/iframe.html?id=<story id>&viewMode=story`, in Chromium at 1280 × 720, and
screenshots the viewport. The viewport and not the story root, because dialogs,
popovers, menus and toasts render in portals outside it.

There are no baseline images in git. They would be more than a thousand PNGs,
and they would only match on the operating system they were taken on, since
fonts and anti-aliasing differ. Instead a baseline is captured from a build
whenever one is needed, and compared against on the same machine:

1. **Baseline.** Screenshot one build. The images go to
   `packages/visual-tests/baseline/`, one `<story id>.png` each, with a
   `baseline.json` listing every story that build has.
2. **Compare.** Screenshot another build and compare each story with its
   baseline image.

In CI the first build is the pull request's base commit and the second is the
pull request itself, so the comparison is "what does this change do to how
things look".

What it does not check: anything below the first 720 pixels of a long page,
dark mode and the theme presets (stories render in light mode with the default
theme unless they set something else themselves), hover and focus states a
story does not set up, and any browser other than Chromium.

### What is held still

Two captures of the same build have to come out identical, or every difference
is suspect. Each test pins down what a story could read that changes from one
run to the next:

| What                 | How                                                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time                 | The clock is stopped at 10:30 UTC on 14 January 2026 before any of the page's scripts run. `Date`, `performance.now()`, timers and `requestAnimationFrame` only move when the test moves them: two seconds after the story mounts, in 10 ms steps, then it stops. |
| Randomness           | `Math.random` returns the same sequence on every load.                                                                                                                                                                                                            |
| CSS animations       | Over before they are first drawn. A finite animation shows its last frame; a spinner or shimmer shows the element's own style.                                                                                                                                    |
| The network          | Requests to other hosts are refused. An image from another host (the stories use picsum.photos) becomes a grey placeholder of the size its URL asks for.                                                                                                          |
| The environment      | Reduced motion, light colour scheme, `en-US`, UTC, one device pixel per CSS pixel.                                                                                                                                                                                |
| Storybook's a11y run | Off for the capture. It scrolls elements into view while it checks contrast.                                                                                                                                                                                      |

A story with a play function runs it before the screenshot. The details, and
the reasons for each, are in the comments of
`packages/visual-tests/tests/stories.spec.ts`.

## Running it locally

Build Storybook, capture a baseline, change something, build again, compare:

```bash
pnpm --filter "@dowel-ui/react^..." build   # once: Storybook imports the themes from dist/
pnpm --filter @dowel-ui/visual-tests exec playwright install chromium   # once
pnpm build-storybook
pnpm visual:baseline
```

```bash
# after your change
pnpm build-storybook
pnpm visual:compare
pnpm visual:report    # opens the report, with the diff images
```

A full pass over the 1,251 stories takes two to three minutes on a laptop.
Anything after the script name goes to Playwright, so
`pnpm visual:compare -g "Foundation/Button"` compares only the stories whose
title matches.

Both commands screenshot `packages/ui/storybook-static`. To compare two builds
that exist side by side, such as a checkout of `main` next to your branch, point
each run at its build:

```bash
STORYBOOK_DIR=../dowel-main/packages/ui/storybook-static pnpm visual:baseline
pnpm visual:compare
```

| Variable              | What it sets                                  | Default                          |
| --------------------- | --------------------------------------------- | -------------------------------- |
| `STORYBOOK_DIR`       | The built Storybook to screenshot             | `packages/ui/storybook-static`   |
| `VISUAL_SNAPSHOT_DIR` | Where the baseline is written and read        | `packages/visual-tests/baseline` |
| `VISUAL_PORT`         | The port the build is served on while it runs | `6008`                           |

A relative path is read from the repository root.

`pnpm visual:stability` captures a baseline and compares the same build against
it straight away. It should always pass. If it does not, a story is not being
captured the same way twice; see [Excluding a story](#excluding-a-story).

## In CI

`.github/workflows/visual.yml` runs on a pull request that touches
`packages/ui`, `packages/themes`, `packages/visual-tests` or the workflow, and
can be started by hand. One job, on one runner:

1. Builds Storybook for the base commit and for the pull request. The base
   build is cached by commit, so later pushes to the same pull request reuse it
   until the base branch moves.
2. Captures the baseline from the base build.
3. Compares the pull request's build against it.
4. Writes a job summary listing the changed, new and removed stories, and
   uploads the Playwright report as the `visual-report` artifact.

The tests themselves always come from the pull request, for both builds. A
change to how stories are captured therefore applies to both sides, and does
not show up as a difference.

On a pull request, "the base commit" is the commit GitHub merged the branch
into to test it, which is the base branch as it is now, not as it was when the
branch started. A branch that is behind `main` is not blamed for what `main`
changed since.

Started by hand on a branch, the job compares it with where it left `main` (or
the branch you name). Started on `main` itself, both builds are the same
commit, which makes the run a stability check on the CI runner.

## Reading a failure

The job summary, and `packages/visual-tests/test-results/summary.md` locally,
sorts every story into one of these:

| Group                  | Meaning                                                                                                              | Fails the job                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Changed                | The screenshot differs from the baseline.                                                                            | Yes, unless labelled `visual-change` |
| Failed                 | The story threw, Storybook could not find it, or the test ran out of time before it could take a screenshot.         | Yes, always                          |
| New                    | The story is not in the base build. Its screenshot is attached to the report so you can look at it.                  | No                                   |
| Removed                | The story is in the base build and not in this one.                                                                  | No                                   |
| Not compared           | The story is in both builds, but could not be captured on the base commit, so it was already broken there.           | No                                   |
| Passed only on a retry | The story differed once and matched the second time. CI retries once; a story that needs it is not being held still. | No                                   |
| Excluded               | Listed in `exclusions.ts`.                                                                                           | No                                   |

For a changed story, open the report: download `visual-report` from the run's
page and open `playwright-report/index.html`, or run `pnpm visual:report`
locally. Each failed test shows the expected image (the base branch), the
actual one (your change) and a diff with the differing pixels in red, with a
slider to wipe between the two.

Then decide which it is:

- **Not what you meant.** Fix it. A token or shared-style change usually shows
  up as dozens of stories at once; the ones you did not expect are the reason
  this check exists.
- **What you meant.** Approve it, as below.
- **Nothing to do with your change.** If the story is one you did not touch and
  the diff looks like two frames of something moving, it is not being captured
  the same way twice. To confirm, capture it and compare it with itself ten
  times over, then see [Excluding a story](#excluding-a-story):

  ```bash
  pnpm visual:baseline -g "<its title>"
  pnpm visual:compare -g "<its title>" --repeat-each=10
  ```

## Approving an intended change

Add the `visual-change` label to the pull request. Adding or removing the label
starts a new run. With the label the job passes when stories differ, and the
summary and the report still list every one of them, so the reviewer sees
exactly what changed.

The label covers differences only. A story that fails to render still fails
the job.

The label applies to the whole pull request, so read the Changed list before
adding it: every story on it should be one you meant to change.

There is nothing to update afterwards. Once the pull request is merged, its
look is the base branch's look, and the next pull request is compared with
that.

Locally, the same switch is `VISUAL_CHANGES_APPROVED=true pnpm visual:compare`.

## How strict the comparison is

A pixel counts as different once its colour has moved by about 5 of the 255
levels of lightness (`threshold: 0.02`), and no pixel may differ
(`maxDiffPixels: 0`).

Both numbers come from measurement. Two captures of the same build are
identical, even with the per-pixel threshold at zero, so there is no noise that
a tolerance has to absorb. And a real change can be very small: making one
button's corners 2px rounder moves six pixels. Any allowance of "a few pixels"
would let that through. The per-pixel threshold is far below Playwright's
default of 0.2, under which a colour token can move a fifth of the way from
black to white without being noticed.

## Excluding a story

A few stories cannot be captured the same way twice, whatever is held still.
Comparing them would fail pull requests that never touched them, and a check
that fails at random gets ignored. They are listed, with the reason, in
`packages/visual-tests/exclusions.ts`:

```ts
export const exclusions: Exclusion[] = [
  { id: "ai-conversation--long-transcript", reason: "…" },
  { title: "Effects/Some Effect", reason: "…" },
];
```

`id` excludes one story: it is the `id` in the story's Storybook URL. `title`
excludes every story under that title. An excluded story is skipped in both
runs and listed in the summary. There is no other way to opt out: no tag, no
story parameter, so the whole list is in one file.

There is one exclusion today. `AI/Conversation / Long Transcript` opens
scrolled to the top on some loads and to the latest message on others, because
of a race inside the component's first frame that the capture cannot reach.

Before adding another, find out what is moving. Clocks, timers, animation
frames, `Math.random`, CSS animations and images from other hosts are already
held still, so a story that still differs is usually doing one of these:

- Racing two things the browser schedules itself, such as a ResizeObserver
  against a mount effect. That is worth fixing in the component: a user gets
  the same coin toss.
- Reading something only the real machine knows, such as GPU output from a
  WebGL shader or a measurement that depends on load.
- Animating through the Web Animations API with no end state.

If the story's own code can be made to settle, do that instead. The list
should stay short enough to read.
