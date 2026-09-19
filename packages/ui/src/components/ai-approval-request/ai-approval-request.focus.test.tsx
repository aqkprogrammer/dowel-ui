import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  ApprovalRequest,
  type ApprovalDecision,
  type ApprovalField,
  type ApprovalRequestProps,
} from "./ai-approval-request";

const FIELDS: ApprovalField[] = [
  { name: "to", label: "To" },
  { name: "subject", label: "Subject" },
];

const ARGS = { to: "dana@acme.test", subject: "Your refund" };

/** A consumer that stores the decision, as a real one would. */
function Stateful(props: Partial<ApprovalRequestProps> & { onDecided?: () => void }) {
  const { onDecided, ...rest } = props;
  const [decision, setDecision] = useState<ApprovalDecision | undefined>(props.decision);
  return (
    <>
      <ApprovalRequest
        tool="send_email"
        summary="Email the customer"
        arguments={ARGS}
        fields={FIELDS}
        decision={decision}
        onDecision={(next) => {
          setDecision(next);
          onDecided?.();
        }}
        {...rest}
      />
      <button type="button">After</button>
    </>
  );
}

function outcome(container: HTMLElement) {
  return container.querySelector<HTMLElement>("[data-slot='approval-outcome']");
}

describe("ApprovalRequest focus on decide (regression: focus fell to <body>)", () => {
  it("moves focus to the outcome after approving", async () => {
    const user = userEvent.setup();
    const { container } = render(<Stateful />);
    await user.click(screen.getByRole("button", { name: "Approve once" }));

    expect(outcome(container)).toHaveFocus();
    expect(outcome(container)).toHaveTextContent("Approved once");
    expect(document.activeElement).not.toBe(document.body);
  });

  it("moves focus to the outcome after denying, from the keyboard", async () => {
    const user = userEvent.setup();
    const { container } = render(<Stateful />);
    screen.getByRole("button", { name: "Deny…" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard("Wrong recipient");
    await user.click(screen.getByRole("button", { name: "Deny" }));

    expect(outcome(container)).toHaveFocus();
    expect(outcome(container)).toHaveTextContent("Denied: Wrong recipient");
  });

  it("marks a live decision for its resolve animation", async () => {
    const user = userEvent.setup();
    const { container } = render(<Stateful />);
    await user.click(screen.getByRole("button", { name: "Always allow send_email" }));
    expect(container.querySelector("[data-slot='approval-request']")).toHaveAttribute(
      "data-resolved",
      "live",
    );
    const sheet = document.querySelector(
      "style[data-href='dowel-ai-approval-request']",
    )?.textContent;
    expect(sheet).toContain("[data-resolved=live] [data-slot=approval-outcome]");
    expect(sheet).toContain("var(--motion-scale");
  });

  it("neither focuses nor animates a decision present from the start", () => {
    const { container } = render(
      <Stateful decision={{ approved: true, scope: "once", arguments: ARGS, edited: [] }} />,
    );
    expect(document.activeElement).toBe(document.body);
    expect(container.querySelector("[data-slot='approval-request']")).not.toHaveAttribute(
      "data-resolved",
    );
  });

  it("does not steal focus for a decision applied from elsewhere", () => {
    const { container, rerender } = render(
      <ApprovalRequest
        tool="send_email"
        summary="Email"
        arguments={ARGS}
        fields={FIELDS}
        onDecision={vi.fn()}
      />,
    );
    rerender(
      <ApprovalRequest
        tool="send_email"
        summary="Email"
        arguments={ARGS}
        fields={FIELDS}
        onDecision={vi.fn()}
        decision={{ approved: false }}
      />,
    );
    expect(outcome(container)).not.toHaveFocus();
    expect(document.activeElement).toBe(document.body);
  });

  it("leaves focus alone with manageFocus={false}", async () => {
    const user = userEvent.setup();
    const { container } = render(<Stateful manageFocus={false} />);
    await user.click(screen.getByRole("button", { name: "Approve once" }));
    expect(outcome(container)).not.toHaveFocus();

    // Deny… does not move focus either.
    render(<Stateful manageFocus={false} />);
    const deny = screen.getAllByRole("button", { name: "Deny…" })[0]!;
    await user.click(deny);
    expect(screen.getByRole("textbox", { name: /Why not/ })).not.toHaveFocus();
  });

  it("does not move focus if the reader moved on before an async decision landed", async () => {
    const user = userEvent.setup();
    let resolve: (() => void) | undefined;
    function Async() {
      const [decision, setDecision] = useState<ApprovalDecision | undefined>();
      return (
        <>
          <ApprovalRequest
            tool="send_email"
            summary="Email"
            arguments={ARGS}
            fields={FIELDS}
            decision={decision}
            onDecision={(next) => {
              resolve = () => {
                setDecision(next);
              };
            }}
          />
          <button type="button">Elsewhere</button>
        </>
      );
    }
    const { container } = render(<Async />);
    await user.click(screen.getByRole("button", { name: "Approve once" }));
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    act(() => {
      resolve?.();
    });
    expect(outcome(container)).not.toHaveFocus();
    expect(screen.getByRole("button", { name: "Elsewhere" })).toHaveFocus();
  });

  it("keeps the outcome out of the Tab sequence", async () => {
    const user = userEvent.setup();
    const { container } = render(<Stateful />);
    await user.click(screen.getByRole("button", { name: "Approve once" }));
    expect(outcome(container)).toHaveAttribute("tabindex", "-1");

    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(outcome(container)).not.toHaveFocus();
  });

  it("has no accessibility violations once decided", async () => {
    const user = userEvent.setup();
    const { container } = render(<Stateful />);
    await user.click(screen.getByRole("button", { name: "Approve once" }));
    await expectNoA11yViolations(container);
  });
});

describe("ApprovalRequest deny panel focus", () => {
  it("focuses the reason field when Deny… opens, and Back returns to Deny…", async () => {
    const user = userEvent.setup();
    const { container } = render(<Stateful />);

    await user.click(screen.getByRole("button", { name: "Deny…" }));
    expect(screen.getByRole("textbox", { name: /Why not/ })).toHaveFocus();
    expect(container.querySelector("[data-slot='approval-deny']")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Deny…" })).toHaveFocus();
  });

  it("gives the actions press feedback", () => {
    render(<Stateful />);
    expect(screen.getByRole("button", { name: "Approve once" })).toHaveClass(
      "active:scale-[0.99]",
    );
  });

  it("forwards its ref, as an object or a callback", () => {
    const ref = createRef<HTMLElement>();
    const callback = vi.fn();
    render(
      <>
        <Stateful ref={ref} />
        <Stateful ref={callback} />
      </>,
    );
    expect(ref.current?.tagName).toBe("SECTION");
    expect(callback).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});
