import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

import { SuggestedValue, type Suggestion } from "./ai-suggested-value";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-md">
    <Story />
  </div>
);

const fieldClass =
  "flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/55";

const COMPANY: Suggestion = {
  value: "Acme Ltd",
  source: "from the invoice header",
  confidence: 0.92,
};

const meta = {
  title: "AI/Suggested Value",
  component: SuggestedValue,
  decorators: [withWidth],
  args: {
    label: "Company",
    suggestion: COMPANY,
    onAccept: () => undefined,
    children: <input id="company" className={fieldClass} defaultValue="" />,
  },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <label htmlFor="company" className="text-sm font-medium">
        Company
      </label>
      <SuggestedValue {...args} />
    </div>
  ),
} satisfies Meta<typeof SuggestedValue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The reason this exists. Accept, and the field says it was filled by AI.
 * Edit it, and it says so. Undo puts back what was there. The value is never
 * written by the component — the app does it, in `onAccept`.
 */
export const Wired: Story = {
  parameters: { controls: { disable: true } },
  render: function Wired() {
    const [value, setValue] = useState("");
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor="company-wired" className="text-sm font-medium">
          Company
        </label>
        <SuggestedValue
          label="Company"
          suggestion={COMPANY}
          value={value}
          onAccept={setValue}
          onRevert={(previous) => {
            setValue(previous ?? "");
          }}
        >
          <input
            id="company-wired"
            className={fieldClass}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
          />
        </SuggestedValue>
      </div>
    );
  },
};

/** Any control. A select's suggestion shows the option's text and hands back its value. */
export const OnASelect: Story = {
  parameters: { controls: { disable: true } },
  render: function OnASelect() {
    const [value, setValue] = useState("");
    return (
      <div className="flex flex-col gap-2">
        <label htmlFor="country" className="text-sm font-medium">
          Country
        </label>
        <SuggestedValue
          label="Country"
          suggestion={{ value: "GB", label: "United Kingdom", source: "from the postcode" }}
          value={value}
          onAccept={setValue}
          onRevert={(previous) => {
            setValue(previous ?? "");
          }}
        >
          <select
            id="country"
            className={fieldClass}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
          >
            <option value="">Choose a country</option>
            <option value="GB">United Kingdom</option>
            <option value="IE">Ireland</option>
            <option value="FR">France</option>
          </select>
        </SuggestedValue>
      </div>
    );
  },
};

/** A guess the model is not sure of says so with the number, not a colour. */
export const LowConfidence: Story = {
  args: {
    label: "Purchase order",
    suggestion: {
      value: "PO-2026-0117",
      source: "inferred from the email subject",
      confidence: 0.31,
    },
  },
};

/**
 * Arriving after the form is on screen, which is the usual case — the upload
 * finishes, the model answers. With `announce` the row is already in the
 * accessibility tree, so the arrival is heard.
 */
export const Arriving: Story = {
  parameters: { controls: { disable: true } },
  render: function Arriving() {
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

    useEffect(() => {
      const timer = setInterval(() => {
        setSuggestion((current) => (current ? null : COMPANY));
      }, 2500);
      return () => {
        clearInterval(timer);
      };
    }, []);

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor="company-arriving" className="text-sm font-medium">
          Company
        </label>
        <SuggestedValue
          label="Company"
          suggestion={suggestion}
          announce
          onAccept={() => undefined}
        >
          <input id="company-arriving" className={fieldClass} defaultValue="" />
        </SuggestedValue>
      </div>
    );
  },
};
