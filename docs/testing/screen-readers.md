# Screen reader testing

jsdom can check what a component puts in the DOM. It cannot check what a
screen reader then says: whether a polite region waits its turn, whether two
additions merge, or whether a heading runs into the next sentence. For
`stream-announcer` those questions are the whole point, so it stays `beta`
until the checks below have passed on real screen readers.

## What runs automatically

`packages/screen-reader-tests` drives real screen readers with
[Guidepup](https://www.guidepup.dev) against the Storybook stories:

| Project     | Screen reader | Browser  | Where                                     |
| ----------- | ------------- | -------- | ----------------------------------------- |
| `harness`   | none          | Chromium | anywhere; proves the scenarios themselves |
| `voiceover` | VoiceOver     | WebKit   | macOS (`macos-latest` in CI)              |
| `nvda`      | NVDA          | Chromium | Windows (`windows-latest` in CI)          |

Each project runs two scenarios:

1. **Whole sentences, once, in order.** Every chunk the announcer hands over
   is spoken. Chunks come out in the order they were handed over, none is
   spoken twice, and nothing from the answer is spoken as part of a sentence.
2. **Pause and resume.** While paused, no response text is spoken beyond what
   was already handed over. After Resume, the next sentence is spoken.

The `harness` project runs the same scenarios against a "perfect listener"
that hears exactly what is in the live region. If `harness` passes and
`voiceover` fails, the problem is the screen reader's behaviour, not the test.

CI runs the workflow `.github/workflows/screen-readers.yml` whenever the
announcer or these tests change, and you can also start it by hand.

### Running VoiceOver locally

**This takes over the Mac.** VoiceOver speaks out loud and captures keyboard
input until the run ends. Guidepup needs VoiceOver to accept AppleScript
control, and your terminal needs Accessibility permission. Both are macOS
settings you change yourself, either by running Guidepup's setup or through
VoiceOver Utility and System Settings:

```bash
npx @guidepup/setup
```

```bash
pnpm --filter @dowel-ui/screen-reader-tests test:voiceover
```

### Running NVDA locally

On Windows, with NVDA installed by Guidepup's setup:

```bash
pnpm --filter @dowel-ui/screen-reader-tests test:nvda
```

## By hand: JAWS, plus one human pass on NVDA and VoiceOver

JAWS cannot run in CI without a licence. And a human notices things a speech
log does not, such as a pause that is too long, a merged sentence that sounds
wrong, or an announcement that talks over typing. So every release that
changes the announcer gets one manual pass per screen reader.

Open the **AI / Stream Announcer → Default** story, in Storybook or on the docs
site. Use the browser the screen reader is usually paired with: JAWS and NVDA
with Chrome, VoiceOver with Safari.

| #   | Do                                                                                                                    | Expect                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Tab to "Read responses as they stream".                                                                               | Announced as a toggle button, not pressed. Nothing else in the group is reachable yet.                                                                                                                                                        |
| 2   | Turn it on, then press "Stream a response". Do nothing else.                                                          | Whole sentences, in order. Never half a sentence, and never "3." without the ".5". "Which to use" is followed by a pause, not run into the next sentence. The code block is read as "Code block, tsx, 3 lines". No asterisks, hashes or URLs. |
| 3   | Start again. After the first sentence, press Pause reading.                                                           | The sentence being spoken finishes, then speech of the response stops. The button is announced as pressed.                                                                                                                                    |
| 4   | Press Resume reading.                                                                                                 | Reading carries on from the next sentence, not from the start.                                                                                                                                                                                |
| 5   | Start again. Once "Skip N queued" shows a number, press it.                                                           | "Skipped N sentences." Then reading continues from whatever arrives next.                                                                                                                                                                     |
| 6   | Press Repeat last.                                                                                                    | The last sentence of the response is spoken again. It is never the "Skipped" notice.                                                                                                                                                          |
| 7   | Start again, then move through the page with the virtual cursor, or type in a text field, while it streams.           | Announcements wait their turn. They do not move the reading cursor or cut off what you are reading or typing mid-word.                                                                                                                        |
| 8   | Open **AI / Agent Surface → Default**. Run the agent, take over by ticking a checkbox, then hand back from the baton. | "Claude has control", then "You have control. Claude is paused", then "Claude has control again". Each is announced once.                                                                                                                     |

### Results

Add a row for each pass. A failure needs an issue link in Notes.

| Screen reader | Version | Browser | OS  | Date | Tester | 1   | 2   | 3   | 4   | 5   | 6   | 7   | 8   | Notes |
| ------------- | ------- | ------- | --- | ---- | ------ | --- | --- | --- | --- | --- | --- | --- | --- | ----- |
| JAWS          |         | Chrome  |     |      |        |     |     |     |     |     |     |     |     |       |
| NVDA          |         | Chrome  |     |      |        |     |     |     |     |     |     |     |     |       |
| VoiceOver     |         | Safari  |     |      |        |     |     |     |     |     |     |     |     |       |

## When `stream-announcer` leaves beta

It becomes `stable` when all three of these hold for the same release:

- `voiceover` and `nvda` pass in CI.
- The results table has a passing row for each of JAWS, NVDA and VoiceOver.
- There is no open issue from step 2, 3 or 7.
