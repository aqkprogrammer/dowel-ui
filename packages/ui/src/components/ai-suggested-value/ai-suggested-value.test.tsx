import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/form";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  SuggestedValue,
  type Suggestion,
  type SuggestedValueProps,
} from "./ai-suggested-value";

const COMPANY: Suggestion = {
  value: "Acme Ltd",
  source: "from the invoice header",
  confidence: 0.92,
};

function Example(props: Partial<SuggestedValueProps<string>> = {}) {
  return (
    <SuggestedValue label="Company" suggestion={COMPANY} onAccept={vi.fn()} {...props}>
      <input aria-label="Company" defaultValue="" />
    </SuggestedValue>
  );
}

/** The way it is used: the app owns the value and writes it on accept. */
function Wired(props: Partial<SuggestedValueProps<string>> = {}) {
  const [value, setValue] = useState("");
  return (
    <SuggestedValue
      label="Company"
      suggestion={COMPANY}
      value={value}
      onAccept={setValue}
      onRevert={(previous) => {
        setValue(previous ?? "");
      }}
      {...props}
    >
      <input
        aria-label="Company"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
    </SuggestedValue>
  );
}

const control = () => screen.getByLabelText("Company");
const accept = () => screen.getByRole("button", { name: "Accept suggestion — Company" });
const dismiss = () => screen.getByRole("button", { name: "Dismiss suggestion — Company" });

describe("SuggestedValue", () => {
  it("offers the value beside the control, not in it", () => {
    render(<Example />);

    expect(control()).toHaveValue("");
    expect(screen.getByText("Acme Ltd")).toBeInTheDocument();
    expect(accept()).toBeInTheDocument();
    expect(dismiss()).toBeInTheDocument();
  });

  it("makes the suggestion the control's description, with its source and confidence", () => {
    render(<Example />);

    expect(control()).toHaveAccessibleDescription(
      "Suggested: Acme Ltd, from the invoice header. 92% confidence",
    );
  });

  it("calls a low confidence low, in words", () => {
    render(<Example suggestion={{ value: "Acme Ltd", confidence: 0.4 }} />);
    expect(control()).toHaveAccessibleDescription(/Low confidence, 40% — worth checking/);
  });

  it("offers nothing, and describes nothing, without a suggestion", () => {
    render(<Example suggestion={null} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(control()).not.toHaveAttribute("aria-describedby");
  });

  it("names every button with the field, so a page of Accepts is a page of different buttons", () => {
    render(
      <>
        <Example label="Company" />
        <SuggestedValue label="Country" suggestion={{ value: "GB" }} onAccept={vi.fn()}>
          <input aria-label="Country" />
        </SuggestedValue>
      </>,
    );

    expect(
      screen.getByRole("button", { name: "Accept suggestion — Company" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Accept suggestion — Country" }),
    ).toBeInTheDocument();
  });

  describe("accepting", () => {
    it("reports the value rather than writing it", async () => {
      // The control is the consumer's. Handing the value over is what lets
      // this wrap a select or a date, where ghost text cannot go.
      const onAccept = vi.fn();
      const user = userEvent.setup();
      render(<Example onAccept={onAccept} />);

      await user.click(accept());

      expect(onAccept).toHaveBeenCalledWith("Acme Ltd", COMPANY);
      expect(control()).toHaveValue("");
    });

    it("then marks the field as filled by AI, in text", async () => {
      const user = userEvent.setup();
      const { container } = render(<Wired />);

      await user.click(accept());

      expect(control()).toHaveValue("Acme Ltd");
      expect(control()).toHaveAccessibleDescription("Filled by AI, from the invoice header");
      expect(container.querySelector("[data-slot='suggested-value']")).toHaveAttribute(
        "data-filled-by",
        "ai",
      );
      expect(screen.queryByRole("button", { name: /Accept/ })).not.toBeInTheDocument();
    });

    it("says when the fill was edited afterwards, so the record is not a guess", async () => {
      const user = userEvent.setup();
      const { container } = render(<Wired />);

      await user.click(accept());
      await user.type(control(), ".");

      expect(control()).toHaveAccessibleDescription(
        /Filled by AI, from the invoice header, then edited/,
      );
      expect(container.querySelector("[data-slot='suggested-value']")).toHaveAttribute(
        "data-edited",
      );
    });

    it("keeps saying filled, not edited, when the value is typed back", async () => {
      const user = userEvent.setup();
      render(<Wired />);

      await user.click(accept());
      await user.type(control(), ".");
      await user.keyboard("{Backspace}");

      expect(control()).not.toHaveAccessibleDescription(/then edited/);
    });

    it("compares with the supplied equality for values that are not primitives", async () => {
      const user = userEvent.setup();
      const suggestion: Suggestion<{ id: string }> = {
        value: { id: "acme" },
        label: "Acme Ltd",
      };
      render(
        <SuggestedValue
          label="Company"
          suggestion={suggestion}
          value={{ id: "acme" }}
          status="accepted"
          equals={(a, b) => a.id === b.id}
          onAccept={vi.fn()}
        >
          <input aria-label="Company" />
        </SuggestedValue>,
      );

      await user.tab();
      expect(control()).not.toHaveAccessibleDescription(/then edited/);
    });
  });

  describe("undo", () => {
    it("puts back what the field held before the fill", async () => {
      const user = userEvent.setup();
      render(<Wired />);

      await user.type(control(), "Acme");
      await user.click(accept());
      expect(control()).toHaveValue("Acme Ltd");

      await user.click(screen.getByRole("button", { name: "Undo — Company" }));

      expect(control()).toHaveValue("Acme");
      expect(accept()).toBeInTheDocument();
    });

    it("is not offered without an onRevert to put the value back", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(accept());
      expect(screen.queryByRole("button", { name: /Undo/ })).not.toBeInTheDocument();
    });
  });

  describe("dismissing", () => {
    it("removes the offer and reports it", async () => {
      const onDismiss = vi.fn();
      const user = userEvent.setup();
      render(<Example onDismiss={onDismiss} />);

      await user.click(dismiss());

      expect(onDismiss).toHaveBeenCalledWith(COMPANY);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(control()).not.toHaveAttribute("aria-describedby");
    });

    it("offers a different suggestion afresh after a dismissal", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Example />);

      await user.click(dismiss());
      rerender(<Example suggestion={{ value: "Acme Limited" }} />);

      expect(screen.getByText("Acme Limited")).toBeInTheDocument();
      expect(accept()).toBeInTheDocument();
    });

    it("does not reopen an accepted suggestion because the parent rebuilt the object", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Example />);

      await user.click(accept());
      rerender(<Example suggestion={{ ...COMPANY }} />);

      expect(screen.queryByRole("button", { name: /Accept/ })).not.toBeInTheDocument();
      expect(control()).toHaveAccessibleDescription(/Filled by AI/);
    });
  });

  describe("status owned by the consumer", () => {
    it("renders whatever status is supplied", () => {
      const { rerender } = render(<Example status="accepted" />);
      expect(control()).toHaveAccessibleDescription(/Filled by AI/);

      rerender(<Example status="dismissed" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("still reports the click when the status does not move", async () => {
      const onAccept = vi.fn();
      const user = userEvent.setup();
      render(<Example status="pending" onAccept={onAccept} />);

      await user.click(accept());

      expect(onAccept).toHaveBeenCalledTimes(1);
      expect(accept()).toBeInTheDocument();
    });
  });

  describe("values that are not strings", () => {
    it("shows a select option by its label and hands back the option value", async () => {
      const onAccept = vi.fn();
      const user = userEvent.setup();
      render(
        <SuggestedValue
          label="Country"
          suggestion={{ value: "GB", label: "United Kingdom" }}
          onAccept={onAccept}
        >
          <select aria-label="Country" defaultValue="">
            <option value="">Choose</option>
            <option value="GB">United Kingdom</option>
          </select>
        </SuggestedValue>,
      );

      expect(screen.getByLabelText("Country")).toHaveAccessibleDescription(
        "Suggested: United Kingdom",
      );
      await user.click(screen.getByRole("button", { name: "Accept suggestion — Country" }));
      expect(onAccept).toHaveBeenCalledWith("GB", { value: "GB", label: "United Kingdom" });
    });

    it("reads a boolean as a word and a number as itself", () => {
      render(
        <>
          <SuggestedValue
            label="VAT registered"
            suggestion={{ value: true }}
            onAccept={vi.fn()}
          >
            <input type="checkbox" aria-label="VAT registered" />
          </SuggestedValue>
          <SuggestedValue label="Seats" suggestion={{ value: 12 }} onAccept={vi.fn()}>
            <input type="number" aria-label="Seats" />
          </SuggestedValue>
        </>,
      );

      expect(screen.getByLabelText("VAT registered")).toHaveAccessibleDescription(
        "Suggested: Yes",
      );
      expect(screen.getByLabelText("Seats")).toHaveAccessibleDescription("Suggested: 12");
    });
  });

  describe("inside a form field", () => {
    function Field(props: { error?: string }) {
      return (
        <FormField name="company" error={props.error}>
          <FormLabel>Company</FormLabel>
          <FormControl>
            <SuggestedValue label="Company" suggestion={COMPANY} onAccept={vi.fn()}>
              <input />
            </SuggestedValue>
          </FormControl>
          <FormDescription>As it appears on the invoice.</FormDescription>
          <FormMessage />
        </FormField>
      );
    }

    it("forwards the field's id to the control, so the label reaches it", () => {
      render(<Field />);
      expect(screen.getByLabelText("Company").tagName).toBe("INPUT");
    });

    it("merges the suggestion into the field's description instead of replacing it", () => {
      render(<Field />);

      expect(screen.getByLabelText("Company")).toHaveAccessibleDescription(
        "As it appears on the invoice. Suggested: Acme Ltd, from the invoice header. 92% confidence",
      );
    });

    it("forwards the invalid state and keeps the message described", () => {
      render(<Field error="Required" />);

      const input = screen.getByLabelText("Company");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription(/Required/);
      expect(input).toHaveAccessibleDescription(/Suggested: Acme Ltd/);
    });

    it("has no accessibility violations", async () => {
      const { container } = render(<Field error="Required" />);
      await expectNoA11yViolations(container);
    });
  });

  it("keeps the control's own aria-describedby", () => {
    render(
      <>
        <p id="hint">Hint</p>
        <SuggestedValue label="Company" suggestion={COMPANY} onAccept={vi.fn()}>
          <input aria-label="Company" aria-describedby="hint" />
        </SuggestedValue>
      </>,
    );

    expect(control()).toHaveAccessibleDescription(/^Hint Suggested: Acme Ltd/);
  });

  describe("announcing", () => {
    it("is silent by default", () => {
      const { container } = render(<Example />);
      expect(container.querySelector("[aria-live]")).not.toBeInTheDocument();
    });

    it("keeps the live row in the tree before there is anything to say", () => {
      // A region that appears at the same moment as its content announces
      // nothing, so the row exists, empty, from the first render.
      const { container, rerender } = render(<Example suggestion={null} announce />);

      const row = container.querySelector("[data-slot='suggested-value-row']");
      expect(row).toHaveAttribute("aria-live", "polite");
      expect(row).not.toHaveClass("hidden");
      expect(row).toBeEmptyDOMElement();

      rerender(<Example announce />);
      expect(row).toHaveTextContent(/Suggested: Acme Ltd/);
    });
  });

  it("lets a className override win a conflict", () => {
    const { container } = render(<Example className="gap-4" />);
    const root = container.querySelector("[data-slot='suggested-value']");
    expect(root).toHaveClass("gap-4");
    expect(root).not.toHaveClass("gap-1.5");
  });

  it("forwards a ref and native attributes to the wrapper", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example ref={ref} data-testid="wrapper" />);
    expect(ref.current).toBe(screen.getByTestId("wrapper"));
  });

  it("has no accessibility violations while pending", async () => {
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations once filled", async () => {
    const user = userEvent.setup();
    const { container } = render(<Wired />);
    await user.click(accept());
    await expectNoA11yViolations(container);
  });
});
