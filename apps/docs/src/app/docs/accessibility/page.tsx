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
