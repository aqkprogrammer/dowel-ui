import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AgentSurface,
  useAgentTool,
  type AgentSurfaceApi,
  type AgentToolCall,
} from "../agent-surface";
import { AgentLedger, isWorthListing, toLedgerAction } from "./agent-ledger";

function Contacts({ approveDeletes = false }: { approveDeletes?: boolean }) {
  const [contacts, setContacts] = useState(["Ada", "Bo", "Cy"]);
  const [order, setOrder] = useState("name");

  useAgentTool<{ name: string }>({
    name: "delete_contact",
    title: "Delete a contact",
    description: "Deletes a contact.",
    requiresApproval: approveDeletes,
    inputSchema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
    describe: ({ name }) => `Deleted ${name}`,
    execute: ({ name }, { onUndo }) => {
      const before = contacts;
      setContacts(before.filter((contact) => contact !== name));
      onUndo(() => {
        setContacts(before);
      });
    },
  });
  useAgentTool({
    name: "email_all",
    title: "Email every contact",
    description: "Emails everyone.",
    reversibility: "irreversible",
    requiresApproval: false,
    describe: () => "Emailed 3 contacts",
    execute: () => "Sent.",
  });
  useAgentTool({
    name: "charge",
    title: "Charge the card",
    description: "Charges.",
    reversibility: "compensable",
    requiresApproval: false,
    describe: () => "Charged $20",
    execute: (_input, { onUndo }) => {
      onUndo(() => {
        throw new Error("The payment provider is down.");
      });
    },
  });
  useAgentTool({
    name: "sort",
    description: "Sorts.",
    execute: () => {
      setOrder("recent");
    },
  });
  useAgentTool({
    name: "list",
    description: "Lists.",
    effect: "read",
    execute: () => contacts,
  });

  return (
    <p aria-label="Contacts">
      {contacts.join(", ")} by {order}
    </p>
  );
}

function setup() {
  const apiRef = createRef<AgentSurfaceApi>();
  const utils = render(
    <AgentSurface apiRef={apiRef} agentName="Claude">
      <Contacts />
      <AgentLedger formatTime={() => "14:02"} />
    </AgentSurface>,
  );
  const api = () => {
    if (!apiRef.current) throw new Error("no api");
    return apiRef.current;
  };
  const run = async (name: string, input?: Record<string, unknown>) => {
    await act(async () => {
      await api().call(name, input);
    });
  };
  return { ...utils, api, run };
}

describe("AgentLedger", () => {
  it("says so before the agent has changed anything", () => {
    setup();
    expect(screen.getByText("Claude has not changed anything yet.")).toBeInTheDocument();
  });

  it("lists the calls worth reverting, and leaves out reads and view changes", async () => {
    const { run } = setup();
    await run("list");
    await run("sort");
    await run("delete_contact", { name: "Bo" });
    await run("email_all");

    const list = screen.getByRole("list", { name: "What Claude did" });
    const entries = Array.from(list.querySelectorAll("label"), (label) => label.textContent);
    expect(entries).toEqual(["Deleted Bo", "Emailed 3 contacts"]);
    expect(screen.getByText("Cannot be undone")).toBeInTheDocument();
    expect(screen.getAllByText("14:02")).toHaveLength(2);
  });

  it("undoes a call through its tool, and tells the agent", async () => {
    const user = userEvent.setup();
    const { run, api } = setup();
    await run("delete_contact", { name: "Bo" });
    expect(screen.getByLabelText("Contacts")).toHaveTextContent("Ada, Cy");

    await user.click(screen.getByLabelText("Deleted Bo"));
    await user.click(screen.getByRole("button", { name: "Undo 1 selected" }));

    expect(screen.getByLabelText("Contacts")).toHaveTextContent("Ada, Bo, Cy");
    expect(screen.getByText("Reverted")).toBeInTheDocument();
    // The reverted entry leaves the selection rather than being counted.
    expect(screen.getByRole("button", { name: "Undo selected" })).toBeDisabled();

    const next = await api().call("list");
    expect(next.text).toMatch(/^The person undid: Deleted Bo\./);
  });

  it("shows why an undo failed on the entry", async () => {
    const user = userEvent.setup();
    const { run } = setup();
    await run("charge");
    await user.click(screen.getByLabelText("Charged $20"));
    await user.click(screen.getByRole("button", { name: "Undo 1 selected" }));
    expect(await screen.findByText("The payment provider is down.")).toBeInTheDocument();
    expect(screen.getByText("Revert failed")).toBeInTheDocument();
  });

  it("shows the arguments, and says when the person corrected them or a browser agent called", async () => {
    const user = userEvent.setup();
    const apiRef = createRef<AgentSurfaceApi>();
    render(
      <AgentSurface
        apiRef={apiRef}
        onApprovalRequest={() => ({ approved: true, input: { name: "Cy" } })}
      >
        <Contacts approveDeletes />
        <AgentLedger />
      </AgentSurface>,
    );
    await act(async () => {
      await apiRef.current?.call("delete_contact", { name: "Bo" }, { source: "webmcp" });
    });
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("region", { name: "Arguments" })).toHaveTextContent('"name": "Cy"');
    expect(screen.getByText("You corrected name before approving.")).toBeInTheDocument();
    expect(screen.getByText("Called by a browser agent.")).toBeInTheDocument();
  });

  it("lets the caller choose what is listed", async () => {
    const apiRef = createRef<AgentSurfaceApi>();
    render(
      <AgentSurface apiRef={apiRef}>
        <Contacts />
        <AgentLedger include={() => true} empty="Nothing here." />
      </AgentSurface>,
    );
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    await act(async () => {
      await apiRef.current?.call("sort");
    });
    expect(screen.getByLabelText("sort")).toBeInTheDocument();
  });

  it("never counts as taking over", async () => {
    const user = userEvent.setup();
    const { run, api } = setup();
    await run("delete_contact", { name: "Bo" });
    act(() => {
      api().grant();
    });
    await user.click(screen.getByLabelText("Deleted Bo"));
    expect(api().getHolder()).toBe("agent");
  });

  it("has no detectable accessibility violations", async () => {
    const { run, container } = setup();
    await run("delete_contact", { name: "Bo" });
    await run("email_all");
    await expectNoA11yViolations(container);
  });
});

const CALL: AgentToolCall = {
  id: "x-1",
  tool: "x",
  title: "Do x",
  summary: "Did x",
  input: {},
  source: "app",
  status: "done",
  effect: "write",
  reversibility: "revertible",
  undoable: true,
  startedAt: 0,
  finishedAt: 0,
};

describe("toLedgerAction", () => {
  it("maps undo state onto ledger status", () => {
    expect(toLedgerAction(CALL).status).toBe("applied");
    expect(toLedgerAction({ ...CALL, undo: "reverting" }).status).toBe("reverting");
    expect(toLedgerAction({ ...CALL, undo: "reverted" }).status).toBe("reverted");
    expect(toLedgerAction({ ...CALL, undo: "failed", undoError: "no" })).toMatchObject({
      status: "failed",
      error: "no",
    });
  });

  it("uses the tool's title as the target only when it adds something", () => {
    expect(toLedgerAction(CALL).target).toBe("Do x");
    expect(toLedgerAction({ ...CALL, summary: "Do x" }).target).toBeUndefined();
  });

  it("formats when the call finished", () => {
    expect(toLedgerAction(CALL, () => "noon").timestamp).toBe("noon");
    expect(typeof toLedgerAction(CALL).timestamp).toBe("string");
    expect(toLedgerAction({ ...CALL, finishedAt: undefined }).timestamp).toBeUndefined();
  });
});

describe("isWorthListing", () => {
  it("lists writes with an undo, and writes whose consequences stand", () => {
    expect(isWorthListing(CALL)).toBe(true);
    expect(isWorthListing({ ...CALL, undoable: false })).toBe(false);
    expect(isWorthListing({ ...CALL, undoable: false, reversibility: "compensable" })).toBe(
      true,
    );
    expect(isWorthListing({ ...CALL, effect: "read" })).toBe(false);
  });
});
