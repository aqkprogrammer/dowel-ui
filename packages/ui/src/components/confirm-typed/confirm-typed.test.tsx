import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ConfirmTyped, type ConfirmTypedProps } from "./confirm-typed";

function Example(props: Partial<ConfirmTypedProps> = {}) {
  return (
    <ConfirmTyped expected="acme-api" action="Delete project" onConfirm={vi.fn()} {...props}>
      <p>This deletes the project, its deployments and its logs.</p>
    </ConfirmTyped>
  );
}

const input = () => screen.getByLabelText(/To confirm, type/);
const button = () => screen.getByRole("button", { name: /Delete project/ });
const status = () => screen.getByRole("status");

describe("ConfirmTyped", () => {
  it("says what to type, and what confirming does", () => {
    render(<Example />);

    expect(input()).toHaveAccessibleName("To confirm, type acme-api");
    expect(screen.getByText("acme-api")).toBeInTheDocument();
    expect(button()).toHaveTextContent("Delete project");
    expect(screen.getByText(/deletes the project/)).toBeInTheDocument();
  });

  it("starts with a hint, an empty announcement, and a button that is reachable", () => {
    render(<Example />);

    expect(input()).toHaveAccessibleDescription("Type it exactly as shown.");
    expect(status()).toBeEmptyDOMElement();
    expect(button()).toBeEnabled();
    expect(button()).toHaveAccessibleDescription("Type it exactly as shown.");
  });

  describe("before the text matches", () => {
    it("does not confirm on the button", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<Example onConfirm={onConfirm} />);

      await user.type(input(), "acme");
      await user.click(button());

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("says why nothing happened, rather than swallowing the press", async () => {
      // The common version disables the button and says nothing. A keyboard
      // user presses it, or Enter, and cannot tell whether anything happened.
      const user = userEvent.setup();
      render(<Example />);

      await user.type(input(), "acme");
      await user.click(button());

      expect(status()).toHaveTextContent("Does not match. Type acme-api exactly.");
      expect(input()).toHaveAttribute("aria-invalid", "true");
      expect(input()).toHaveAccessibleDescription("Does not match. Type acme-api exactly.");
      expect(input()).toHaveFocus();
    });

    it("treats Enter the same way", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<Example onConfirm={onConfirm} />);

      await user.type(input(), "acme-ap{Enter}");

      expect(onConfirm).not.toHaveBeenCalled();
      expect(status()).toHaveTextContent(/Does not match/);
    });

    it("stays quiet while typing, so every keystroke is not a verdict", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.type(input(), "acme-ap");

      expect(status()).toBeEmptyDOMElement();
      expect(input()).not.toHaveAttribute("aria-invalid");
    });

    it("does not count an empty field as a match for an empty expectation", () => {
      const { container } = render(<Example expected="" />);
      expect(container.querySelector("[data-slot='confirm-typed']")).toHaveAttribute(
        "data-state",
        "idle",
      );
    });
  });

  describe("once it matches", () => {
    it("announces the match once, and names the action that became available", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.type(input(), "acme-api");

      expect(status()).toHaveTextContent("Matches. Delete project is available.");
      expect(input()).toHaveAccessibleDescription("Matches.");
    });

    it("confirms on the button", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<Example onConfirm={onConfirm} />);

      await user.type(input(), "acme-api");
      await user.click(button());

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("confirms on Enter", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<Example onConfirm={onConfirm} />);

      await user.type(input(), "acme-api{Enter}");

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("clears an earlier mismatch", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.type(input(), "acme{Enter}");
      expect(input()).toHaveAttribute("aria-invalid", "true");

      await user.type(input(), "-api");
      expect(input()).not.toHaveAttribute("aria-invalid");
    });

    it("stops matching when the text is changed again", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<Example onConfirm={onConfirm} />);

      await user.type(input(), "acme-api!");
      await user.click(button());

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it("ignores surrounding whitespace, which a reader cannot see", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<Example onConfirm={onConfirm} />);

      await user.type(input(), " acme-api {Enter}");

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("is case-sensitive by default, and not when told", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(<Example onConfirm={onConfirm} />);

      await user.type(input(), "ACME-API{Enter}");
      expect(onConfirm).not.toHaveBeenCalled();

      rerender(<Example onConfirm={onConfirm} caseSensitive={false} />);
      expect(input()).toHaveAccessibleDescription("Matches.");
      await user.keyboard("{Enter}");
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("accepts a paste", async () => {
      // Blocking paste punishes the people who cannot type a long name easily
      // and stops nobody who can select-all and copy.
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<Example onConfirm={onConfirm} />);

      await user.click(input());
      await user.paste("acme-api");
      await user.keyboard("{Enter}");

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe("while the action runs", () => {
    it("keeps the button focusable, says it is busy, and does not confirm again", async () => {
      const onConfirm = vi.fn();
      const user = userEvent.setup();
      render(<Example onConfirm={onConfirm} pending value="acme-api" />);

      expect(button()).toHaveTextContent("Delete project…");
      expect(button()).toHaveAttribute("aria-busy", "true");
      expect(button()).not.toBeDisabled();

      await user.click(button());
      await user.type(input(), "{Enter}");
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  it("works controlled", async () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <>
          <ConfirmTyped
            expected="acme-api"
            action="Delete project"
            value={value}
            onValueChange={setValue}
            onConfirm={vi.fn()}
          />
          <output>{value}</output>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(input(), "acme");
    expect(screen.getByText("acme", { selector: "output" })).toBeInTheDocument();
  });

  it("offers a primary variant for an action that is not destructive", () => {
    render(<Example variant="primary" action="Transfer ownership" />);
    expect(screen.getByRole("button", { name: "Transfer ownership" })).toHaveClass(
      "bg-primary",
    );
  });

  it("lets a className override win a conflict", () => {
    const { container } = render(<Example className="gap-6" />);
    const root = container.querySelector("[data-slot='confirm-typed']");
    expect(root).toHaveClass("gap-6");
    expect(root).not.toHaveClass("gap-2");
  });

  it("forwards a ref and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example ref={ref} data-testid="confirm" />);
    expect(ref.current).toBe(screen.getByTestId("confirm"));
  });

  it("has no accessibility violations before, during and after a mismatch", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    await expectNoA11yViolations(container);

    await user.type(input(), "acme{Enter}");
    await expectNoA11yViolations(container);

    await user.type(input(), "-api");
    await expectNoA11yViolations(container);
  });
});
