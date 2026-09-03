import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { AIDisclosure, AIDisclosureProvenance } from "./ai-disclosure";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-xl">
    <Story />
  </div>
);

const meta = {
  title: "AI/AI Disclosure",
  component: AIDisclosure,
  decorators: [withWidth],
  args: { kind: "generated" },
} satisfies Meta<typeof AIDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default: a mark you can ignore, and a sentence you cannot. */
export const Default: Story = {};

/**
 * The four situations, which are not invented — they are the human-visible
 * disclosures EU AI Act Article 50 creates. `assisted` is there because the same
 * paragraph exempts content under human review or editorial control, and saying
 * so is more use to a reader than saying nothing.
 */
export const Kinds: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <AIDisclosure kind="interaction" />
      <AIDisclosure kind="generated" />
      <AIDisclosure kind="manipulated" />
      <AIDisclosure kind="assisted" />
    </div>
  ),
};

/** Above a conversation, where Article 50(1) usually belongs. */
export const Conversation: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <AIDisclosure kind="interaction" variant="banner" />
      <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        What is our refund window?
      </div>
      <div className="w-fit rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
        Thirty days from delivery, on unopened items.
      </div>
    </div>
  ),
};

/**
 * Over an image. The overlay sits on the media rather than beside it, because a
 * label that a screenshot leaves behind has disclosed nothing.
 */
export const OnMedia: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="relative w-fit overflow-hidden rounded-xl">
      <div
        aria-hidden
        className="size-64 bg-[linear-gradient(140deg,var(--color-info),var(--color-primary),var(--color-warning))]"
      />
      <div className="absolute bottom-2 left-2">
        <AIDisclosure kind="manipulated" variant="overlay" />
      </div>
    </div>
  ),
};

/**
 * Claims, not proof.
 *
 * "Made with Acme Diffusion 3" looks like a fact and is a string somebody put in
 * a file. The panel names who asserts it and says plainly whether anyone
 * checked — the default being that nobody did, because a component that stays
 * quiet about verification reads as verified.
 */
export const Provenance: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <AIDisclosure kind="generated">
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <AIDisclosureProvenance
          claims={[
            { label: "Model", value: "Acme Diffusion 3" },
            { label: "Created", value: "3 September 2026" },
            { label: "Prompt", value: "A harbour at dawn, long exposure" },
          ]}
        />
      </AIDisclosure>

      <AIDisclosure kind="generated">
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <AIDisclosureProvenance
          source="Acme Trust"
          verified
          claims={[
            { label: "Model", value: "Acme Diffusion 3" },
            { label: "Created", value: "3 September 2026" },
            { label: "Manifest", value: "c2pa:urn:uuid:6b1a…" },
          ]}
        />
      </AIDisclosure>

      <AIDisclosure kind="manipulated">
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <AIDisclosureProvenance
          source="Acme Trust"
          verified={false}
          claims={[
            { label: "Model", value: "unknown" },
            { label: "Manifest", value: "signature did not match the bytes" },
          ]}
        />
      </AIDisclosure>
    </div>
  ),
};

/**
 * Your own words and your own mark.
 *
 * The Commission publishes three icons for this and lets anyone use them
 * without attribution. They are deliberately not bundled here — an official
 * mark shipped inside a component library ends up on content nobody checked —
 * and the Commission's own line applies either way: using them "does not
 * establish legal compliance by itself".
 */
export const YourOwnWording: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <AIDisclosure kind="interaction" label="You're talking to Ada, our support bot" />
      <AIDisclosure
        kind="generated"
        label="Draft written by AI — check it before sending"
        icon={
          <span aria-hidden className="grid size-3.5 place-items-center rounded-full border">
            i
          </span>
        }
      />
    </div>
  ),
};
