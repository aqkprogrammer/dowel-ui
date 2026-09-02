import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  ApprovalRequest,
  type ApprovalField,
  type ApprovalRequestProps,
} from "./ai-approval-request";

const FIELDS: ApprovalField[] = [
  { name: "to", label: "To" },
  { name: "subject", label: "Subject" },
  { name: "body", label: "Body", multiline: true },
];

const ARGS = {
  to: "dana@acme.test",
  subject: "Your refund is on its way",
  body: "We have refunded $240 to your original payment method.",
};

function Example(props: Partial<ApprovalRequestProps> = {}) {
  return (
    <ApprovalRequest
      tool="send_email"
      summary="Email the customer about their refund"
      arguments={ARGS}
      fields={FIELDS}
      onDecision={vi.fn()}
      {...props}
    />
  );
}

describe("ApprovalRequest", () => {
  it("shows what the call will do, in the reader's language", () => {
    render(<Example />);
    expect(screen.getByText("Email the customer about their refund")).toBeInTheDocument();
    expect(screen.getByText("send_email")).toBeInTheDocument();
  });

  it("renders each argument as a labelled control", () => {
    render(<Example />);

    expect(screen.getByLabelText("To")).toHaveValue("dana@acme.test");
    expect(screen.getByLabelText("Subject")).toHaveValue("Your refund is on its way");
    expect(screen.getByLabelText("Body")).toHaveValue(ARGS.body);
  });

  describe("editing the proposal", () => {
    it("returns the corrected arguments, not the model's", async () => {
      // The whole point. Every surveyed implementation returns a boolean over a
      // read-only payload, forcing a choice between approving something wrong
      // and denying it outright.
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      const to = screen.getByLabelText("To");
      await user.clear(to);
      await user.type(to, "finance@acme.test");
      await user.click(screen.getByRole("button", { name: /Approve with changes/ }));

      expect(onDecision).toHaveBeenCalledTimes(1);
      const decision = onDecision.mock.calls[0]?.[0] as { arguments: Record<string, string> };
      expect(decision.arguments.to).toBe("finance@acme.test");
      expect(decision.arguments.subject).toBe(ARGS.subject);
    });

    it("reports which arguments the human changed", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.clear(screen.getByLabelText("To"));
      await user.type(screen.getByLabelText("To"), "x@y.test");
      await user.click(screen.getByRole("button", { name: /Approve with changes/ }));

      expect((onDecision.mock.calls[0]?.[0] as { edited: string[] }).edited).toEqual(["to"]);
    });

    it("marks a changed argument in text, not only by colour", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.type(screen.getByLabelText("Subject"), "!");
      expect(screen.getByText(/· changed/)).toBeInTheDocument();
    });

    it("keeps the field's accessible name stable while it is edited", async () => {
      // The marker belongs in a description, not the name. Inside the label it
      // renames the field as you type, and a screen reader user hears the
      // control they are in change identity mid-edit.
      const user = userEvent.setup();
      render(<Example />);

      await user.type(screen.getByLabelText("To"), "x");

      const field = screen.getByLabelText("To");
      expect(field).toHaveAccessibleDescription(/changed from the model/);
    });

    it("says the approval carries changes, so the button matches what it does", async () => {
      const user = userEvent.setup();
      render(<Example />);

      expect(screen.getByRole("button", { name: "Approve once" })).toBeInTheDocument();

      await user.type(screen.getByLabelText("Subject"), "!");
      expect(screen.getByRole("button", { name: "Approve with changes" })).toBeInTheDocument();
    });

    it("reports nothing edited when the value is typed back to the original", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      const subject = screen.getByLabelText("Subject");
      await user.type(subject, "!");
      await user.keyboard("{Backspace}");
      await user.click(screen.getByRole("button", { name: "Approve once" }));

      expect((onDecision.mock.calls[0]?.[0] as { edited: string[] }).edited).toEqual([]);
    });

    it("shows a locked argument without letting it be changed", () => {
      render(
        <Example
          fields={[{ name: "to", label: "To", readOnly: true }]}
          arguments={{ to: "dana@acme.test" }}
        />,
      );

      expect(screen.queryByLabelText("To")).not.toBeInTheDocument();
      expect(screen.getByText("dana@acme.test")).toBeInTheDocument();
    });
  });

  describe("while the arguments are still arriving", () => {
    it("renders the request rather than nothing", () => {
      // The common implementation returns null until the tool input is
      // complete, so nothing is on screen when approval becomes relevant.
      render(<Example arguments={{ to: "dana@acme.test" }} streaming />);

      expect(screen.getByText("Email the customer about their refund")).toBeInTheDocument();
      expect(screen.getByLabelText("To")).toBeInTheDocument();
    });

    it("reports itself busy", () => {
      const { container } = render(<Example arguments={{ to: "x" }} streaming />);
      expect(container.querySelector("[data-slot='approval-request']")).toHaveAttribute(
        "aria-busy",
        "true",
      );
    });

    it("holds the decision until the request is whole", () => {
      render(<Example arguments={{ to: "dana@acme.test" }} streaming />);

      expect(screen.getByRole("button", { name: "Approve once" })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Always allow/ })).toBeDisabled();
    });

    it("says why the decision is held", () => {
      render(<Example arguments={{ to: "x" }} streaming />);
      expect(screen.getByText(/Waiting for the model to finish/)).toBeInTheDocument();
    });

    it("still waits when streaming has stopped but an argument never arrived", () => {
      render(<Example arguments={{ to: "x", subject: "y" }} />);
      expect(screen.getByRole("button", { name: "Approve once" })).toBeDisabled();
    });

    it("enables the decision once everything has arrived", () => {
      render(<Example />);
      expect(screen.getByRole("button", { name: "Approve once" })).toBeEnabled();
    });
  });

  describe("scope", () => {
    it("returns once for a single approval", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.click(screen.getByRole("button", { name: "Approve once" }));
      expect(onDecision.mock.calls[0]?.[0]).toMatchObject({ approved: true, scope: "once" });
    });

    it("returns always, and names the tool so consent is not blanket by accident", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      const always = screen.getByRole("button", { name: "Always allow send_email" });
      await user.click(always);

      expect(onDecision.mock.calls[0]?.[0]).toMatchObject({ approved: true, scope: "always" });
    });
  });

  describe("denial", () => {
    it("asks for a reason rather than denying on the first click", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.click(screen.getByRole("button", { name: "Deny…" }));

      expect(onDecision).not.toHaveBeenCalled();
      expect(screen.getByLabelText(/Why not/)).toBeInTheDocument();
    });

    it("returns the reason with the denial", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.click(screen.getByRole("button", { name: "Deny…" }));
      await user.type(screen.getByLabelText(/Why not/), "Wrong customer");
      await user.click(screen.getByRole("button", { name: "Deny" }));

      expect(onDecision).toHaveBeenCalledWith({ approved: false, reason: "Wrong customer" });
    });

    it("allows denying without a reason", async () => {
      const onDecision = vi.fn();
      const user = userEvent.setup();
      render(<Example onDecision={onDecision} />);

      await user.click(screen.getByRole("button", { name: "Deny…" }));
      await user.click(screen.getByRole("button", { name: "Deny" }));

      expect(onDecision).toHaveBeenCalledWith({ approved: false, reason: undefined });
    });

    it("can be backed out of", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.click(screen.getByRole("button", { name: "Deny…" }));
      await user.click(screen.getByRole("button", { name: "Back" }));

      expect(screen.getByRole("button", { name: "Approve once" })).toBeInTheDocument();
    });
  });

  describe("irreversibility", () => {
    it("states it as a sentence, not a colour", () => {
      render(<Example irreversible="A sent email cannot be recalled." />);
      expect(screen.getByText("A sent email cannot be recalled.")).toBeInTheDocument();
    });
  });

  describe("once decided", () => {
    it("reports an approval and how many arguments were corrected", () => {
      render(
        <Example
          decision={{ approved: true, scope: "once", arguments: ARGS, edited: ["to"] }}
        />,
      );

      expect(screen.getByText(/Approved once, with 1 argument corrected/)).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("reports blanket approval differently from a single one", () => {
      render(
        <Example decision={{ approved: true, scope: "always", arguments: ARGS, edited: [] }} />,
      );
      expect(screen.getByText(/Approved for every call to this tool/)).toBeInTheDocument();
    });

    it("reports a denial with its reason", () => {
      render(<Example decision={{ approved: false, reason: "Wrong customer" }} />);
      expect(screen.getByText("Denied: Wrong customer")).toBeInTheDocument();
    });
  });

  it("has no accessibility violations while forming", async () => {
    const { container } = render(<Example arguments={{ to: "dana@acme.test" }} streaming />);
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations awaiting a decision", async () => {
    const { container } = render(<Example irreversible="A sent email cannot be recalled." />);
    await expectNoA11yViolations(container);
  });
});
