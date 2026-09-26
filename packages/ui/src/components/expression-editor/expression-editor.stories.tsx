import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import {
  defaultExpressionFunctions,
  ExpressionArgumentError,
  ExpressionEditor,
  type ExpressionFunctions,
} from "./expression-editor";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-lg">
    <Story />
  </div>
);

const LINE_ITEM = {
  price: 12,
  qty: 3,
  discount: 0.1,
  customer: { tier: "gold", country: "DE", orders: 14 },
};

const meta = {
  title: "Form/Expression Editor",
  component: ExpressionEditor,
  decorators: [withWidth],
  args: {
    label: "Line total",
    description: "Type a name for suggestions, or press Ctrl+Space.",
    defaultValue: "round(price * qty * (1 - discount), 2)",
    variables: LINE_ITEM,
    locale: "en-GB",
  },
} satisfies Meta<typeof ExpressionEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A pricing rule over a line item. Type `cu` to see a group of fields, `r` for
 * the functions, and change `qty` to `qty0` to see the error and its
 * suggestion.
 */
export const Default: Story = {};

/**
 * A typo. The field is aria-invalid, the misspelt name is underlined with a
 * wavy line, and the message under the field names the likely variable.
 */
export const ErrorState: Story = {
  args: { defaultValue: "prise * qty - discount" },
};

const RATES: Record<string, number> = { DE: 0.19, FR: 0.2, GB: 0.2 };

const WITH_TAX: ExpressionFunctions = {
  ...defaultExpressionFunctions,
  vat: {
    evaluate: (amount, country) => {
      if (typeof amount !== "number")
        throw new ExpressionArgumentError(0, "vat needs an amount.");
      const rate = typeof country === "string" ? RATES[country] : undefined;
      if (rate === undefined) {
        throw new ExpressionArgumentError(1, "vat knows DE, FR and GB.");
      }
      return amount * rate;
    },
    minArgs: 2,
    maxArgs: 2,
    signature: "vat(amount, country)",
    description: "Tax owed on an amount",
  },
  tierDiscount: {
    evaluate: (tier) => (tier === "gold" ? 0.15 : tier === "silver" ? 0.05 : 0),
    minArgs: 1,
    maxArgs: 1,
    signature: "tierDiscount(tier)",
    description: "Discount for a loyalty tier",
  },
};

/**
 * The app's own functions next to the defaults. Only functions in this list
 * can be called; everything else is an unknown function. A function that
 * rejects one argument underlines that argument.
 */
export const CustomFunctions: Story = {
  args: {
    functions: WITH_TAX,
    defaultValue:
      "price * qty * (1 - tierDiscount(customer.tier)) + vat(price * qty, customer.country)",
  },
};

/** A longer rule over several lines, where Enter starts a new line. */
export const Multiline: Story = {
  args: {
    multiline: true,
    rows: 4,
    label: "Free shipping when",
    description: "Must come out true or false.",
    defaultValue: "customer.orders >= 10\n  or price * qty >= 100\n  or customer.tier = 'gold'",
  },
};

/**
 * No result line, for a rule whose value only matters when it runs. Errors
 * still show. The saved value is written out below as the field changes.
 */
export const WithoutResult: Story = {
  parameters: { controls: { disable: true } },
  render: function WithoutResult() {
    const [value, setValue] = useState("if(customer.tier = 'gold', price * 0.85, price)");
    return (
      <div className="flex flex-col gap-3">
        <ExpressionEditor
          label="Unit price rule"
          variables={LINE_ITEM}
          value={value}
          onValueChange={setValue}
          showResult={false}
        />
        <p className="text-xs text-muted-foreground">
          Saved value: <code className="font-mono">{value}</code>
        </p>
      </div>
    );
  },
};
