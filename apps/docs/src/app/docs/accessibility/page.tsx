import type { Metadata } from "next";
import Link from "next/link";

import { Prose } from "~/components/prose";
import { branding } from "~/lib/branding";

export const metadata: Metadata = {
  title: "Accessibility",
  description: `How ${branding.libraryName} approaches accessibility, and where it differs from the common approach.`,
};

const DECISIONS = [
  {
    title: "A streaming transcript is not a live region",
    body: "The obvious implementation marks a chat log aria-live so new content is announced. Under streaming that produces an announcement per token: continuous interruption, and already-read text re-announced as the node mutates. The transcript here is an ordinary list, navigable at the reader's pace, and a separate status region announces state — never content.",
    where: "/docs/components/ai-conversation",
  },
  {
    title: "A loading button keeps its focus",
    body: "Disabling a button while it works removes it from the focus order and strands the keyboard position of the person who just pressed it. Loading uses aria-disabled and aria-busy with a guarded click handler instead. Genuinely inert controls still use disabled.",
    where: "/docs/components/button",
  },
  {
    title: "Alerts are not live regions by default",
    body: 'A live region that already exists when the page paints announces itself for no reason, and trains people to ignore it. Opt in with live="polite" for something that appeared in response to an action, or live="assertive" for an error that must interrupt.',
    where: "/docs/components/alert",
  },
  {
    title: "The name goes where the role is",
    body: 'Slider\'s accessible name is forwarded onto its thumbs, because the thumb is the element with role="slider" — left on the root it names something with no role at all. A range slider names each thumb separately, since two controls called "Price" tell you nothing about which one you are on.',
    where: "/docs/components/slider",
  },
  {
    title: "Scrollable regions are focusable",
    body: "A table or code block that overflows its container is unreachable by keyboard unless the scroll container can take focus. Both are focusable named regions rather than silent focus stops.",
    where: "/docs/components/table",
  },
  {
    title: "Status is never colour alone",
    body: "Tool calls and agent states say what they are in words. These states matter most when something has failed, which is exactly when a colour-only signal fails the people who most need to notice it.",
    where: "/docs/components/ai-tool",
  },
  {
    title: "Nothing points at an element that was not rendered",
    body: "Form fields assemble aria-describedby from the description and error that actually exist. A dangling reference announces nothing and is flagged by automated testing, so presence is tracked rather than assumed.",
    where: "/docs/components/form",
  },
];

export default function AccessibilityPage() {
  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Accessibility</h1>

      <Prose>
        <p>
          The target is WCAG 2.2 AA. Every component has an automated accessibility assertion in
          its test suite and runs under an accessibility checker in the component workshop with
          findings set to fail rather than warn. Keyboard interaction is tested, not assumed.
        </p>
        <p>
          None of that is unusual. What follows is the part that is: the places where the
          accessible choice differs from the common one, and why.
        </p>
      </Prose>

      <div className="mt-8 grid gap-4">
        {DECISIONS.map((decision) => (
          <section key={decision.title} className="rounded-xl border border-border p-5">
            <h2 className="text-sm font-medium">{decision.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{decision.body}</p>
            <Link
              href={decision.where}
              className="mt-3 inline-block text-xs font-medium text-primary underline underline-offset-4"
            >
              See it in context
            </Link>
          </section>
        ))}
      </div>

      <Prose>
        <h2>Right to left</h2>
        <p>
          Every direction-dependent style is written logically — <code>ps-</code>,{" "}
          <code>me-</code>, <code>text-end</code> — so the layout follows <code>dir</code> on
          its own. <code>pnpm audit:rtl</code> fails the build on any physical property that has
          a logical equivalent, and on any icon that points along the reading direction without
          being mirrored, because logical CSS mirrors the box an icon sits in and not the glyph
          inside it.
        </p>
        <p>An application in Arabic, Hebrew, Persian or Urdu needs two things:</p>
        <ul>
          <li>
            <code>dir=&quot;rtl&quot;</code> on the document, which the styling follows.
          </li>
          <li>
            <code>DirectionProvider</code> around the tree. The primitives read direction from
            React context rather than from the document and assume left-to-right without it,
            which mirrors a page everywhere except its menus, selects and sliders — worse than
            not mirroring at all, because it looks deliberate.
          </li>
        </ul>
        <p>
          Two things stay physical on purpose. A <code>Sheet</code> with{" "}
          <code>side=&quot;left&quot;</code> and a toast at{" "}
          <code>position=&quot;bottom-right&quot;</code> are named after a side, and a control
          asked for on the left that appears on the right is an API telling a lie. The logical
          versions of those are <code>start</code>/<code>end</code> props, which would be a
          rename rather than a restyle.
        </p>
        <p>
          What this does not claim: the components have not been reviewed by a reader of a
          right-to-left language. The audit checks that nothing is styled or drawn against the
          direction, which is necessary and not sufficient.
        </p>

        <h2>What automated testing does not cover</h2>
        <p>
          Automated checks catch a minority of accessibility problems. They cannot tell whether
          a label is meaningful, whether a focus order makes sense, or whether an announcement
          is useful rather than merely present. Where a decision depended on judgement, it is
          written down on the component&rsquo;s page so it can be argued with.
        </p>
        <p>
          Some behaviour also cannot be verified in a test environment without layout —
          collision -aware positioning, hover grace areas, scroll geometry. Those are exercised
          in a real browser instead, and the tests say so rather than asserting against a stub.
        </p>
      </Prose>
    </article>
  );
}
