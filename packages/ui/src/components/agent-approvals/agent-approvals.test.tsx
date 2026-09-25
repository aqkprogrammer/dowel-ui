import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AgentSurface, useAgentTool, type AgentSurfaceApi } from "../agent-surface";
import { AgentApprovals, approvalFields, correctedInput } from "./agent-approvals";

function Mailer() {
  const [sent, setSent] = useState<string[]>([]);
  useAgentTool<{ to: string; subject: string; copies?: number; urgent?: boolean }>({
    name: "send_email",
    title: "Send an email",
    description: "Sends an email.",
    reversibility: "irreversible",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "To" },
        subject: { type: "string" },
        copies: { type: "integer", minimum: 1 },
        urgent: { type: "boolean" },
      },
      required: ["to", "subject"],
    },
    describe: ({ to }) => `Emailed ${to}`,
    execute: ({ to }) => {
      setSent((current) => [...current, to]);
    },
  });
  useAgentTool({
    name: "refund",
    title: "Refund the order",
    description: "Refunds.",
    reversibility: "compensable",
    requiresApproval: true,
    execute: () => "Refunded.",
  });
  return <output aria-label="Sent">{sent.join(", ")}</output>;
}

function setup(withApprovals = true) {
  const apiRef = createRef<AgentSurfaceApi>();
  const utils = render(
    <AgentSurface apiRef={apiRef} agentName="Claude">
      {withApprovals ? <AgentApprovals /> : null}
      <Mailer />
    </AgentSurface>,
  );
  const api = () => {
    if (!apiRef.current) throw new Error("no api");
    return apiRef.current;
  };
  return { ...utils, api };
}

const EMAIL = { to: "dana@acme.test", subject: "Your refund" };

describe("AgentApprovals", () => {
  it("shows the request with the agent's arguments as fields, and says it is waiting", () => {
    const { api, container } = setup();
    act(() => {
      void api().call("send_email", EMAIL);
    });
    expect(screen.getByRole("heading", { name: "Send an email" })).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toHaveValue("dana@acme.test");
    expect(screen.getByLabelText("Subject")).toHaveValue("Your refund");
    expect(screen.getByText("This cannot be undone once it runs.")).toBeInTheDocument();
    const status = container.querySelector("[data-slot='agent-approvals-status']");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveTextContent("Claude is waiting for your approval: Send an email.");
  });

  it("runs the call once approved", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = api().call("send_email", EMAIL);
    });
    await user.click(screen.getByRole("button", { name: "Approve once" }));
    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(screen.getByLabelText("Sent")).toHaveTextContent("dana@acme.test");
    // The outcome stays on screen until the next request.
    expect(screen.getByText("Approved once")).toBeInTheDocument();
  });

  it("runs the person's corrected arguments", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = api().call("send_email", EMAIL);
    });
    const to = screen.getByLabelText("To");
    await user.clear(to);
    await user.type(to, "sam@acme.test");
    await user.click(screen.getByRole("button", { name: "Approve with changes" }));
    await expect(pending).resolves.toMatchObject({
      ok: true,
      text: "Done: Emailed sam@acme.test.",
    });
    expect(screen.getByLabelText("Sent")).toHaveTextContent("sam@acme.test");
  });

  it("tells the agent the reason it was denied", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = api().call("send_email", EMAIL);
    });
    await user.click(screen.getByRole("button", { name: "Deny…" }));
    await user.type(screen.getByLabelText(/Why not/), "Wrong customer");
    await user.click(screen.getByRole("button", { name: "Deny" }));
    await expect(pending).resolves.toMatchObject({
      status: "refused",
      text: "The person declined this action: Wrong customer",
    });
  });

  it("stops asking once a tool is allowed for the session", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    let first: Promise<unknown> = Promise.resolve();
    act(() => {
      first = api().call("send_email", EMAIL);
    });
    await user.click(screen.getByRole("button", { name: "Always allow send_email" }));
    await first;
    let second;
    await act(async () => {
      second = await api().call("send_email", { to: "lee@acme.test", subject: "Hi" });
    });
    expect(second).toMatchObject({ ok: true });
    expect(screen.getByLabelText("Sent")).toHaveTextContent("dana@acme.test, lee@acme.test");
  });

  it("queues requests, one on screen, and says how many wait", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    act(() => {
      void api().call("send_email", EMAIL);
      void api().call("refund");
    });
    expect(screen.getByText("1 more request waiting")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Approve once" }));
    expect(screen.getByRole("heading", { name: "Refund the order" })).toBeInTheDocument();
    expect(
      screen.getByText("Once this runs it can only be offset by another action, not undone."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/more request/)).not.toBeInTheDocument();
  });

  it("refuses whatever is waiting when it unmounts", async () => {
    const apiRef = createRef<AgentSurfaceApi>();
    const { rerender } = render(
      <AgentSurface apiRef={apiRef}>
        <AgentApprovals />
        <Mailer />
      </AgentSurface>,
    );
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = apiRef.current?.call("send_email", EMAIL) ?? Promise.resolve();
    });
    rerender(
      <AgentSurface apiRef={apiRef}>
        <Mailer />
      </AgentSurface>,
    );
    await expect(pending).resolves.toMatchObject({ status: "refused" });
  });

  it("never counts as taking over, since it is the agent's own interface", async () => {
    const user = userEvent.setup();
    const { api } = setup();
    act(() => {
      api().grant();
      void api().call("send_email", EMAIL);
    });
    await user.click(screen.getByRole("button", { name: "Approve once" }));
    expect(api().getHolder()).toBe("agent");
  });

  it("renders nothing visible until asked", () => {
    const { container } = setup();
    expect(container.querySelector("[data-slot='approval-request']")).toBeNull();
  });

  it("has no detectable accessibility violations with a request open", async () => {
    const { container, api } = setup();
    act(() => {
      void api().call("send_email", EMAIL);
    });
    await expectNoA11yViolations(container);
  });
});

describe("approvalFields", () => {
  it("shows only arguments the agent sent, in schema order, labelled", () => {
    const { fields, values } = approvalFields(
      {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient" },
          cc: { type: "string" },
          tags: { type: "array" },
          send_at: { type: "string" },
        },
      },
      { tags: ["a"], to: "x@y.test", send_at: "later", extra: 1 },
      { send_at: "Send at" },
    );
    expect(fields.map((field) => [field.name, field.label, field.readOnly])).toEqual([
      ["to", "Recipient", false],
      ["tags", "Tags", true],
      ["send_at", "Send at", false],
      ["extra", "Extra", false],
    ]);
    expect(values).toEqual({ to: "x@y.test", tags: '["a"]', send_at: "later", extra: "1" });
  });

  it("makes long or multi-line text a textarea", () => {
    const { fields } = approvalFields(undefined, { body: "a\nb", note: "x".repeat(61) });
    expect(fields.every((field) => field.multiline)).toBe(true);
  });
});

describe("correctedInput", () => {
  const schema = {
    type: "object" as const,
    properties: {
      copies: { type: "integer" as const },
      urgent: { type: "boolean" as const },
      to: { type: "string" as const },
    },
  };

  it("types the edits back the way the tool takes them", () => {
    expect(
      correctedInput(
        schema,
        {},
        {
          approved: true,
          scope: "once",
          edited: ["copies", "urgent", "to"],
          arguments: { copies: "3", urgent: "false", to: "a@b.test" },
        },
      ),
    ).toEqual({ copies: 3, urgent: false, to: "a@b.test" });
  });

  it("leaves unparseable values as text, so validation can say what is wrong", () => {
    expect(
      correctedInput(
        schema,
        {},
        {
          approved: true,
          scope: "once",
          edited: ["copies", "urgent"],
          arguments: { copies: "many", urgent: "maybe" },
        },
      ),
    ).toEqual({ copies: "many", urgent: "maybe" });
  });

  it("is nothing when nothing was edited", () => {
    expect(
      correctedInput(schema, {}, { approved: true, scope: "once", edited: [], arguments: {} }),
    ).toBeUndefined();
  });

  it("falls back to the original value's type without a schema", () => {
    expect(
      correctedInput(
        undefined,
        { n: 1 },
        {
          approved: true,
          scope: "once",
          edited: ["n"],
          arguments: { n: "2" },
        },
      ),
    ).toEqual({ n: 2 });
  });
});
