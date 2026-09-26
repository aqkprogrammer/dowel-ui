import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AgentSurface,
  useAgentSurface,
  useAgentTool,
  type AgentSurfaceApi,
  type AgentSurfaceProps,
  type AgentToolCall,
} from "./agent-surface";

interface Deal {
  id: string;
  name: string;
  amount: number;
}

const DEALS: Deal[] = [
  { id: "a", name: "Acme", amount: 300 },
  { id: "b", name: "Bolt", amount: 100 },
  { id: "c", name: "Cove", amount: 200 },
];

/** A small table that registers what a person can do to it as tools. */
function Deals({
  onDelete,
  slow,
  describe = "Sort the deals table by a column.",
}: {
  onDelete?: () => void;
  slow?: Promise<void>;
  describe?: string;
}) {
  const [deals, setDeals] = useState(DEALS);
  const listRef = useRef<HTMLUListElement>(null);

  useAgentTool<{ column: "name" | "amount"; direction?: "asc" | "desc" }>({
    name: "sort",
    title: "Sort deals",
    description: describe,
    inputSchema: {
      type: "object",
      properties: {
        column: { type: "string", enum: ["name", "amount"] },
        direction: { type: "string", enum: ["asc", "desc"] },
      },
      required: ["column"],
      additionalProperties: false,
    },
    target: listRef,
    describe: ({ column }) => `Sorted deals by ${column}`,
    execute: async ({ column, direction = "asc" }) => {
      if (slow) await slow;
      const sign = direction === "asc" ? 1 : -1;
      setDeals((current) =>
        [...current].sort((x, y) => (x[column] > y[column] ? sign : -sign)),
      );
      return `Sorted by ${column}, ${direction}.`;
    },
  });

  useAgentTool({
    name: "list",
    description: "The deals, in table order.",
    effect: "read",
    untrustedOutput: true,
    execute: () => ({ deals }),
  });

  useAgentTool<{ id: string }>({
    name: "delete",
    description: "Delete a deal.",
    reversibility: "irreversible",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    describe: ({ id }) => `Deleted deal ${id}`,
    execute: ({ id }) => {
      onDelete?.();
      setDeals((current) => current.filter((deal) => deal.id !== id));
    },
  });

  return (
    <>
      <ul ref={listRef} aria-label="Deals">
        {deals.map((deal) => (
          <li key={deal.id}>{deal.name}</li>
        ))}
      </ul>
      <button type="button">Refresh</button>
      <p>Plain text</p>
    </>
  );
}

function names(): string[] {
  return screen.getAllByRole("listitem").map((item) => item.textContent);
}

function setup(
  props: Partial<AgentSurfaceProps> = {},
  deals: Parameters<typeof Deals>[0] = {},
) {
  const apiRef = createRef<AgentSurfaceApi>();
  const utils = render(
    <AgentSurface apiRef={apiRef} data-testid="surface" {...props}>
      <Deals {...deals} />
    </AgentSurface>,
  );
  const api = () => {
    if (!apiRef.current) throw new Error("no api");
    return apiRef.current;
  };
  const status = () => {
    const found = utils.container.querySelector("[data-slot='agent-surface-status']");
    if (!found) throw new Error("no status");
    return found;
  };
  return { ...utils, api, status, surface: () => screen.getByTestId("surface") };
}

afterEach(() => {
  Reflect.deleteProperty(document, "modelContext");
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AgentSurface", () => {
  describe("tools", () => {
    it("lists what is registered, with hints derived from each tool", () => {
      const { api } = setup();
      const tools = api().tools();
      expect(tools.map((tool) => tool.name)).toEqual(["sort", "list", "delete"]);

      const [sort, list, remove] = tools;
      expect(sort?.title).toBe("Sort deals");
      expect(sort?.annotations).toEqual({
        readOnlyHint: false,
        consequentialHint: false,
        untrustedContentHint: false,
      });
      expect(list?.annotations).toMatchObject({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
      expect(list?.inputSchema).toEqual({ type: "object", properties: {} });
      expect(remove?.annotations).toMatchObject({ consequentialHint: true });
      expect(remove?.reversibility).toBe("irreversible");
    });

    it("prefixes names with the surface's name", () => {
      const { api } = setup({ name: "deals" });
      expect(
        api()
          .tools()
          .map((tool) => tool.name),
      ).toEqual(["deals_sort", "deals_list", "deals_delete"]);
    });

    it("runs the same handler a person would, and tells the agent what happened", async () => {
      const onToolCall = vi.fn();
      const { api } = setup({ onToolCall });

      let result;
      await act(async () => {
        result = await api().call("sort", { column: "amount", direction: "desc" });
      });

      expect(result).toEqual({ ok: true, status: "done", text: "Sorted by amount, desc." });
      expect(names()).toEqual(["Acme", "Cove", "Bolt"]);
      const statuses = onToolCall.mock.calls.map(([call]) => (call as AgentToolCall).status);
      expect(statuses).toEqual(["running", "done"]);
      expect(onToolCall.mock.calls[1]?.[0]).toMatchObject({
        tool: "sort",
        title: "Sort deals",
        summary: "Sorted deals by amount",
        source: "app",
        effect: "write",
        reversibility: "revertible",
      });
    });

    it("returns data as JSON text and as data", async () => {
      const { api } = setup();
      const result = await api().call("list");
      expect(result.ok).toBe(true);
      expect(JSON.parse(result.text)).toEqual({ deals: DEALS });
      expect(result.data).toEqual({ deals: DEALS });
    });

    it("says what was done when a tool returns nothing", async () => {
      const onApprovalRequest = vi.fn(() => true);
      const { api } = setup({ onApprovalRequest });
      let result;
      await act(async () => {
        result = await api().call("delete", { id: "b" });
      });
      expect(result).toMatchObject({ ok: true, text: "Done: Deleted deal b." });
      expect(names()).toEqual(["Acme", "Cove"]);
    });

    it("refuses input that does not match, saying why, and runs nothing", async () => {
      const onToolCall = vi.fn();
      const { api } = setup({ onToolCall });
      const result = await api().call("sort", { column: "value" });
      expect(result).toEqual({
        ok: false,
        status: "refused",
        text: 'Invalid input: column must be one of: "name", "amount".',
      });
      expect(names()).toEqual(["Acme", "Bolt", "Cove"]);
      expect(onToolCall).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "refused" }),
      );
    });

    it("refuses a tool that does not exist", async () => {
      const { api } = setup();
      expect(await api().call("nope")).toMatchObject({
        ok: false,
        text: 'There is no tool named "nope" on this page.',
      });
    });

    it("reports a tool that throws as failed", async () => {
      function Broken() {
        useAgentTool({
          name: "broken",
          description: "Always fails.",
          effect: "read",
          execute: () => {
            throw new Error("database offline");
          },
        });
        return null;
      }
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface apiRef={apiRef}>
          <Broken />
        </AgentSurface>,
      );
      await expect(apiRef.current?.call("broken")).resolves.toMatchObject({
        ok: false,
        status: "failed",
        text: "Failed: database offline",
      });
    });

    it("unregisters a tool while it is disabled, and when its component unmounts", () => {
      function Toggle({ enabled }: { enabled: boolean }) {
        useAgentTool({
          name: "t",
          description: "d",
          effect: "read",
          enabled,
          execute: () => "",
        });
        return null;
      }
      const apiRef = createRef<AgentSurfaceApi>();
      const { rerender } = render(
        <AgentSurface apiRef={apiRef}>
          <Toggle enabled={false} />
        </AgentSurface>,
      );
      expect(apiRef.current?.tools()).toEqual([]);
      rerender(
        <AgentSurface apiRef={apiRef}>
          <Toggle enabled />
        </AgentSurface>,
      );
      expect(apiRef.current?.tools()).toHaveLength(1);
      rerender(<AgentSurface apiRef={apiRef} />);
      expect(apiRef.current?.tools()).toEqual([]);
    });

    it("warns in development about an invalid name and a duplicate", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      function Bad() {
        useAgentTool({ name: "has space", description: "d", execute: () => "" });
        useAgentTool({ name: "twice", description: "d", execute: () => "one" });
        useAgentTool({ name: "twice", description: "d", execute: () => "two" });
        return null;
      }
      render(
        <AgentSurface>
          <Bad />
        </AgentSurface>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"has space" is not a valid'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('Two tools are named "twice"'));
    });

    it("marks the element a tool acts on, briefly", async () => {
      vi.useFakeTimers();
      const { api } = setup();
      const list = screen.getByRole("list", { name: "Deals" });
      await act(async () => {
        await api().call("sort", { column: "name" });
      });
      expect(list).toHaveAttribute("data-agent-touched");
      act(() => {
        vi.advanceTimersByTime(2_000);
      });
      expect(list).not.toHaveAttribute("data-agent-touched");
    });

    it("passes the caller's abort signal through", async () => {
      let release = () => undefined as void;
      const slow = new Promise<void>((resolve) => {
        release = resolve;
      });
      const { api } = setup({}, { slow });
      const controller = new AbortController();
      const pending = api().call("sort", { column: "name" }, { signal: controller.signal });
      controller.abort();
      release();
      await expect(pending).resolves.toMatchObject({ ok: false, status: "failed" });
    });
  });

  describe("approval", () => {
    it("refuses an irreversible action when there is no way to ask", async () => {
      const onDelete = vi.fn();
      const { api } = setup({}, { onDelete });
      expect(await api().call("delete", { id: "a" })).toMatchObject({
        ok: false,
        status: "refused",
        text: "This action needs the person's approval, and this page has no way to ask for it.",
      });
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("asks, and runs only when approved", async () => {
      const onDelete = vi.fn();
      const onApprovalRequest = vi.fn(() => Promise.resolve(false));
      const { api } = setup({ onApprovalRequest }, { onDelete });

      expect(await api().call("delete", { id: "a" })).toMatchObject({
        text: "The person declined this action.",
      });
      expect(onApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({ summary: "Deleted deal a", reversibility: "irreversible" }),
      );
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("treats an approval handler that throws as a refusal", async () => {
      const onDelete = vi.fn();
      const { api } = setup(
        {
          onApprovalRequest: () => {
            throw new Error("dialog crashed");
          },
        },
        { onDelete },
      );
      expect(await api().call("delete", { id: "a" })).toMatchObject({ ok: false });
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("refuses if the person takes over while approval is pending", async () => {
      let approve = (_value: boolean) => undefined as void;
      const onDelete = vi.fn();
      const { api } = setup(
        {
          defaultHolder: "agent",
          onApprovalRequest: () =>
            new Promise<boolean>((resolve) => {
              approve = resolve;
            }),
        },
        { onDelete },
      );
      const pending = api().call("delete", { id: "a" });
      act(() => {
        api().takeOver();
      });
      approve(true);
      await expect(pending).resolves.toMatchObject({ status: "refused" });
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe("control", () => {
    it("is shared by default, and marks who holds it", () => {
      const { api, surface } = setup();
      expect(api().getHolder()).toBe("shared");
      expect(surface()).toHaveAttribute("data-holder", "shared");
      act(() => {
        api().grant();
      });
      expect(surface()).toHaveAttribute("data-holder", "agent");
    });

    it("refuses every call while the person holds control, reads included", async () => {
      const { api } = setup({ defaultHolder: "person" });
      for (const name of ["sort", "list"]) {
        expect(await api().call(name, { column: "name" })).toMatchObject({
          ok: false,
          status: "refused",
          text: "The person has taken control of this page. Wait until they hand it back, then try again.",
        });
      }
    });

    it("aborts a running call when the person takes over", async () => {
      let release = () => undefined as void;
      const slow = new Promise<void>((resolve) => {
        release = resolve;
      });
      const { api } = setup({ defaultHolder: "agent" }, { slow });
      const pending = api().call("sort", { column: "amount" });
      act(() => {
        api().takeOver();
      });
      release();
      await expect(pending).resolves.toMatchObject({
        ok: false,
        status: "failed",
        text: "Stopped: the person took control before this finished.",
      });
    });

    it("announces each change of control, in words", () => {
      const onControlChange = vi.fn();
      const { api, status } = setup({ agentName: "Claude", onControlChange });
      expect(status()).toHaveAttribute("role", "status");
      expect(status()).toBeEmptyDOMElement();

      act(() => {
        api().grant();
      });
      expect(status()).toHaveTextContent("Claude has control.");

      act(() => {
        api().handOver("Sign in to your bank to continue");
      });
      expect(status()).toHaveTextContent(
        "Claude needs you: Sign in to your bank to continue. You have control.",
      );
      expect(onControlChange).toHaveBeenLastCalledWith({
        holder: "person",
        previous: "agent",
        by: "agent",
        reason: "Sign in to your bank to continue",
        note: undefined,
      });

      act(() => {
        api().handBack();
      });
      expect(status()).toHaveTextContent("Claude has control again.");

      act(() => {
        api().release();
      });
      expect(status()).toHaveTextContent("Claude is no longer in control.");

      act(() => {
        api().takeOver();
      });
      expect(status()).toHaveTextContent("You have control. Claude is paused.");

      act(() => {
        api().handBack();
      });
      expect(status()).toHaveTextContent("Claude can act on this page again.");
    });

    it("ignores a hand-back when the person does not hold control", () => {
      const onControlChange = vi.fn();
      const { api } = setup({ defaultHolder: "agent", onControlChange });
      act(() => {
        api().handBack("nothing to hand back");
      });
      expect(api().getHolder()).toBe("agent");
      expect(onControlChange).not.toHaveBeenCalled();
    });

    it("delivers the hand-back note with the agent's next call, once", async () => {
      const onControlChange = vi.fn();
      const { api } = setup({ defaultHolder: "agent", onControlChange });
      act(() => {
        api().takeOver();
      });
      act(() => {
        api().handBack("  I signed in. Continue from checkout.  ");
      });
      expect(onControlChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          holder: "agent",
          note: "I signed in. Continue from checkout.",
        }),
      );

      const first = await api().call("list");
      expect(first.text).toMatch(
        /^Note from the person, who handed control back: "I signed in\. Continue from checkout\."\n\n/,
      );
      const second = await api().call("list");
      expect(second.text).not.toContain("Note from the person");
    });

    it("delivers the note even when the next call is refused", async () => {
      const { api } = setup({ defaultHolder: "person" });
      act(() => {
        api().handBack("Use the EU account");
      });
      const result = await api().call("sort", { column: "nope" });
      expect(result.text).toContain('"Use the EU account"');
    });

    it("can be controlled", () => {
      const onControlChange = vi.fn();
      const { api, surface, rerender } = setup({ holder: "agent", onControlChange });
      act(() => {
        api().takeOver();
      });
      expect(onControlChange).toHaveBeenCalledWith(
        expect.objectContaining({ holder: "person" }),
      );
      // The parent has not agreed yet.
      expect(surface()).toHaveAttribute("data-holder", "agent");
      rerender(
        <AgentSurface holder="person" data-testid="surface">
          <Deals />
        </AgentSurface>,
      );
      expect(surface()).toHaveAttribute("data-holder", "person");
    });

    describe("taking over by input", () => {
      it("takes over when the person activates a control while the agent drives", () => {
        const { api } = setup({ defaultHolder: "agent" });
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        expect(api().getHolder()).toBe("person");
      });

      it("takes over when the person edits a field", () => {
        const apiRef = createRef<AgentSurfaceApi>();
        render(
          <AgentSurface apiRef={apiRef} defaultHolder="agent">
            <label>
              Name <input />
            </label>
          </AgentSurface>,
        );
        fireEvent.input(screen.getByRole("textbox"), { target: { value: "x" } });
        expect(apiRef.current?.getHolder()).toBe("person");
      });

      it("does not take over for a click on plain content", () => {
        const { api } = setup({ defaultHolder: "agent" });
        fireEvent.click(screen.getByText("Plain text"));
        expect(api().getHolder()).toBe("agent");
      });

      it("does not take over from interface that is about the agent", () => {
        // Approving the agent's call is not taking the page back from it.
        const apiRef = createRef<AgentSurfaceApi>();
        render(
          <AgentSurface apiRef={apiRef} defaultHolder="agent">
            <div data-agent-ui="">
              <button type="button">Allow</button>
            </div>
          </AgentSurface>,
        );
        fireEvent.click(screen.getByRole("button"));
        expect(apiRef.current?.getHolder()).toBe("agent");
      });

      it("does not take over when only a button is allowed to", () => {
        const { api } = setup({ defaultHolder: "agent", takeOverOn: "explicit" });
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        expect(api().getHolder()).toBe("agent");
      });

      it("does not take over when nobody is driving", () => {
        const { api } = setup();
        fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
        expect(api().getHolder()).toBe("shared");
      });

      it("does not mistake the agent's own clicks for the person's", async () => {
        function Clicker() {
          const buttonRef = useRef<HTMLButtonElement>(null);
          useAgentTool({
            name: "press",
            description: "Presses the button.",
            execute: () => {
              buttonRef.current?.click();
              return "Pressed.";
            },
          });
          return (
            <button ref={buttonRef} type="button">
              Target
            </button>
          );
        }
        const apiRef = createRef<AgentSurfaceApi>();
        render(
          <AgentSurface apiRef={apiRef} defaultHolder="agent">
            <Clicker />
          </AgentSurface>,
        );
        await act(async () => {
          await apiRef.current?.call("press");
        });
        expect(apiRef.current?.getHolder()).toBe("agent");
      });

      it("still runs the consumer's own capture handlers", () => {
        const onClickCapture = vi.fn();
        const onInputCapture = vi.fn();
        render(
          <AgentSurface onClickCapture={onClickCapture} onInputCapture={onInputCapture}>
            <input aria-label="Field" />
          </AgentSurface>,
        );
        const field = screen.getByRole("textbox");
        fireEvent.click(field);
        fireEvent.input(field, { target: { value: "y" } });
        expect(onClickCapture).toHaveBeenCalled();
        expect(onInputCapture).toHaveBeenCalled();
      });
    });
  });

  describe("approval answers", () => {
    it("runs the person's corrected arguments, and records which they changed", async () => {
      const onToolCall = vi.fn();
      const { api } = setup({
        onToolCall,
        onApprovalRequest: () => ({ approved: true, input: { id: "c" } }),
      });
      let result;
      await act(async () => {
        result = await api().call("delete", { id: "a" });
      });
      expect(result).toMatchObject({ ok: true, text: "Done: Deleted deal c." });
      expect(names()).toEqual(["Acme", "Bolt"]);
      expect(onToolCall).toHaveBeenLastCalledWith(
        expect.objectContaining({
          input: { id: "c" },
          edited: ["id"],
          summary: "Deleted deal c",
        }),
      );
    });

    it("holds corrected arguments to the tool's schema", async () => {
      const onDelete = vi.fn();
      const { api } = setup(
        { onApprovalRequest: () => ({ approved: true, input: { id: 42 } }) },
        { onDelete },
      );
      expect(await api().call("delete", { id: "a" })).toMatchObject({
        status: "refused",
        text: "Invalid input: id must be a string.",
      });
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("tells the agent why the person declined", async () => {
      const { api } = setup({
        onApprovalRequest: () => ({ approved: false, reason: "Wrong customer" }),
      });
      expect(await api().call("delete", { id: "a" })).toMatchObject({
        text: "The person declined this action: Wrong customer",
      });
    });

    it("stops asking about a tool approved for the session", async () => {
      const onApprovalRequest = vi.fn(() => ({
        approved: true as const,
        scope: "always" as const,
      }));
      const { api } = setup({ onApprovalRequest });
      await act(async () => {
        await api().call("delete", { id: "a" });
      });
      await act(async () => {
        await api().call("delete", { id: "b" });
      });
      expect(onApprovalRequest).toHaveBeenCalledOnce();
      expect(names()).toEqual(["Cove"]);
    });

    it("lets an approval UI inside the surface answer, and fails closed when it leaves", async () => {
      const answer = vi.fn(() => true);
      function Approver() {
        const { registerApprover } = useAgentSurface();
        useEffect(() => registerApprover(answer), [registerApprover]);
        return null;
      }
      const apiRef = createRef<AgentSurfaceApi>();
      const { rerender } = render(
        <AgentSurface apiRef={apiRef}>
          <Deals />
          <Approver />
        </AgentSurface>,
      );
      await act(async () => {
        await apiRef.current?.call("delete", { id: "a" });
      });
      expect(answer).toHaveBeenCalledOnce();

      rerender(
        <AgentSurface apiRef={apiRef}>
          <Deals />
        </AgentSurface>,
      );
      await expect(apiRef.current?.call("delete", { id: "b" })).resolves.toMatchObject({
        status: "refused",
      });
    });

    it("prefers the onApprovalRequest prop over a mounted approver", async () => {
      const mounted = vi.fn(() => true);
      const prop = vi.fn(() => false);
      function Approver() {
        const { registerApprover } = useAgentSurface();
        useEffect(() => registerApprover(mounted), [registerApprover]);
        return null;
      }
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface apiRef={apiRef} onApprovalRequest={prop}>
          <Deals />
          <Approver />
        </AgentSurface>,
      );
      await apiRef.current?.call("delete", { id: "a" });
      expect(prop).toHaveBeenCalledOnce();
      expect(mounted).not.toHaveBeenCalled();
    });
  });

  it("refuses on a failed precondition before asking for approval", async () => {
    function Guarded() {
      useAgentTool({
        name: "launch",
        description: "Launches.",
        reversibility: "irreversible",
        precondition: () => "Fuel the rocket first.",
        execute: () => "Launched.",
      });
      return null;
    }
    const onApprovalRequest = vi.fn(() => true);
    const apiRef = createRef<AgentSurfaceApi>();
    render(
      <AgentSurface apiRef={apiRef} onApprovalRequest={onApprovalRequest}>
        <Guarded />
      </AgentSurface>,
    );
    await expect(apiRef.current?.call("launch")).resolves.toMatchObject({
      status: "refused",
      text: "Fuel the rocket first.",
    });
    expect(onApprovalRequest).not.toHaveBeenCalled();
  });

  describe("undo", () => {
    function Counter() {
      const [count, setCount] = useState(0);
      useAgentTool<{ by: number }>({
        name: "add",
        description: "Adds to the counter.",
        inputSchema: {
          type: "object",
          properties: { by: { type: "number" } },
          required: ["by"],
        },
        describe: ({ by }) => `Added ${String(by)}`,
        execute: ({ by }, { onUndo }) => {
          const before = count;
          setCount(before + by);
          onUndo(() => {
            setCount(before);
          });
        },
      });
      useAgentTool({
        name: "fragile",
        description: "Has an undo that fails.",
        execute: (_input, { onUndo }) => {
          onUndo(() => {
            throw new Error("the ledger is locked");
          });
        },
      });
      useAgentTool({ name: "plain", description: "No undo.", execute: () => "ok" });
      return <output aria-label="Count">{count}</output>;
    }

    function setupCounter() {
      const apiRef = createRef<AgentSurfaceApi>();
      const onToolCall = vi.fn();
      const utils = render(
        <AgentSurface apiRef={apiRef} onToolCall={onToolCall} agentName="Claude">
          <Counter />
        </AgentSurface>,
      );
      const api = () => {
        if (!apiRef.current) throw new Error("no api");
        return apiRef.current;
      };
      const lastCall = () => onToolCall.mock.lastCall?.[0] as AgentToolCall;
      return { ...utils, api, lastCall };
    }

    it("takes a call back through the undo its tool registered", async () => {
      const { api, lastCall, container } = setupCounter();
      await act(async () => {
        await api().call("add", { by: 5 });
      });
      expect(screen.getByLabelText("Count")).toHaveTextContent("5");
      const call = lastCall();
      expect(call.undoable).toBe(true);

      let undone;
      await act(async () => {
        undone = await api().undo(call.id);
      });
      expect(undone).toBe(true);
      expect(screen.getByLabelText("Count")).toHaveTextContent("0");
      expect(lastCall()).toMatchObject({ undo: "reverted" });
      expect(container.querySelector("[data-slot='agent-surface-status']")).toHaveTextContent(
        "Undone: Added 5.",
      );
    });

    it("tells the agent what the person undid, with its next result", async () => {
      const { api, lastCall } = setupCounter();
      await act(async () => {
        await api().call("add", { by: 2 });
      });
      await act(async () => {
        await api().undo(lastCall().id);
      });
      const next = await api().call("plain");
      expect(next.text).toBe("The person undid: Added 2.\n\nok");
    });

    it("cannot undo the same call twice, or a call it does not know", async () => {
      const { api, lastCall } = setupCounter();
      await act(async () => {
        await api().call("add", { by: 1 });
      });
      const id = lastCall().id;
      await act(async () => {
        await api().undo(id);
      });
      expect(await api().undo(id)).toBe(false);
      expect(await api().undo("nope")).toBe(false);
    });

    it("says so when there is no undo, or the undo fails", async () => {
      const { api, lastCall, container } = setupCounter();
      await act(async () => {
        await api().call("plain");
      });
      expect(lastCall().undoable).toBe(false);
      await act(async () => {
        await api().undo(lastCall().id);
      });
      expect(lastCall()).toMatchObject({
        undo: "failed",
        undoError: "No undo was provided for this action.",
      });

      await act(async () => {
        await api().call("fragile");
      });
      await act(async () => {
        await api().undo(lastCall().id);
      });
      expect(lastCall()).toMatchObject({ undo: "failed", undoError: "the ledger is locked" });
      expect(container.querySelector("[data-slot='agent-surface-status']")).toHaveTextContent(
        "Could not undo: fragile. the ledger is locked",
      );
    });
  });

  describe("history", () => {
    it("keeps every call's latest state, oldest first", async () => {
      function Watch() {
        const { calls } = useAgentSurface();
        return (
          <ol aria-label="Calls">
            {calls.map((call) => (
              <li key={call.id}>{`${call.id} ${call.tool} ${call.status}`}</li>
            ))}
          </ol>
        );
      }
      const seen = () =>
        Array.from(screen.getByRole("list", { name: "Calls" }).children, (item) =>
          (item.textContent ?? "").split(" "),
        );
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface apiRef={apiRef}>
          <Deals />
          <Watch />
        </AgentSurface>,
      );
      await act(async () => {
        await apiRef.current?.call("list");
        await apiRef.current?.call("sort", { column: "bad" });
      });
      expect(seen().map(([, tool, status]) => [tool, status])).toEqual([
        ["list", "done"],
        ["sort", "refused"],
      ]);
    });

    it("drops the oldest calls past two hundred", async () => {
      function Watch() {
        const { calls } = useAgentSurface();
        return (
          <ol aria-label="Calls">
            {calls.map((call) => (
              <li key={call.id}>{`${call.id} ${call.tool} ${call.status}`}</li>
            ))}
          </ol>
        );
      }
      const seen = () =>
        Array.from(screen.getByRole("list", { name: "Calls" }).children, (item) =>
          (item.textContent ?? "").split(" "),
        );
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface apiRef={apiRef}>
          <Deals />
          <Watch />
        </AgentSurface>,
      );
      await act(async () => {
        for (let i = 0; i < 205; i += 1) await apiRef.current?.call("list");
      });
      expect(seen()).toHaveLength(200);
      expect(seen()[0]?.[0]).toBe("list-6");
    });
  });

  describe("dry runs", () => {
    function Deleter({ preview }: { preview: () => unknown }) {
      useAgentTool<{ ids: string[] }>({
        name: "delete_rows",
        title: "Delete rows",
        description: "Deletes rows.",
        reversibility: "irreversible",
        inputSchema: { type: "object", properties: { ids: { type: "array" } } },
        preview: preview as never,
        execute: () => "Deleted.",
      });
      return null;
    }

    function Watch() {
      const { calls } = useAgentSurface();
      const preview = calls.at(-1)?.preview;
      return <output aria-label="Preview">{JSON.stringify(preview ?? null)}</output>;
    }

    it("runs alongside the approval and reaches the approver's view of the call", async () => {
      let answer = (_ok: boolean) => undefined as void;
      const onApprovalRequest = vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            answer = resolve;
          }),
      );
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface apiRef={apiRef} onApprovalRequest={onApprovalRequest}>
          <Deleter
            preview={() =>
              Promise.resolve({
                changes: [{ id: "a", label: "Acme", kind: "delete" }],
                total: 3,
              })
            }
          />
          <Watch />
        </AgentSurface>,
      );
      let pending: Promise<unknown> = Promise.resolve();
      act(() => {
        pending = apiRef.current?.call("delete_rows", { ids: ["a"] }) ?? Promise.resolve();
      });
      // Asked at once, before the dry run has finished.
      expect(onApprovalRequest).toHaveBeenCalledOnce();
      expect(screen.getByLabelText("Preview")).toHaveTextContent('{"state":"loading"}');
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByLabelText("Preview")).toHaveTextContent('"state":"ready"');
      expect(screen.getByLabelText("Preview")).toHaveTextContent('"total":3');
      await act(async () => {
        answer(true);
        await pending;
      });
    });

    it("records a dry run that fails, and still asks", async () => {
      const onApprovalRequest = vi.fn(() => false);
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface apiRef={apiRef} onApprovalRequest={onApprovalRequest}>
          <Deleter
            preview={() => {
              throw new Error("The database is read-only.");
            }}
          />
          <Watch />
        </AgentSurface>,
      );
      await act(async () => {
        await apiRef.current?.call("delete_rows", { ids: ["a"] });
      });
      expect(onApprovalRequest).toHaveBeenCalledOnce();
      expect(screen.getByLabelText("Preview")).toHaveTextContent(
        '{"state":"failed","error":"The database is read-only."}',
      );
    });

    it("is not run when no approval is asked for", async () => {
      const preview = vi.fn(() => ({ changes: [] }));
      function Quiet() {
        useAgentTool({
          name: "tidy",
          description: "Tidies.",
          preview,
          execute: () => "Tidied.",
        });
        return null;
      }
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface apiRef={apiRef}>
          <Quiet />
        </AgentSurface>,
      );
      await apiRef.current?.call("tidy");
      expect(preview).not.toHaveBeenCalled();
    });
  });

  it("records exactly what the agent was told, notices included", async () => {
    const onToolCall = vi.fn();
    const { api } = setup({ onToolCall, defaultHolder: "person" });
    act(() => {
      api().handBack("Use the EU account");
    });
    await api().call("list");
    const told = (onToolCall.mock.lastCall?.[0] as AgentToolCall).told ?? "";
    expect(told).toMatch(
      /^Note from the person, who handed control back: "Use the EU account"\n\n\{/,
    );
  });

  it("tells the agent what it is notified of, once, with its next result", async () => {
    const { api } = setup();
    api().notify("The person accepted 2 of your 3 suggestions.");
    api().notify("   ");
    expect((await api().call("list")).text).toMatch(
      /^The person accepted 2 of your 3 suggestions\.\n\n\{/,
    );
    expect((await api().call("list")).text).not.toContain("accepted");
  });

  it("keeps a timestamped log of control changes", () => {
    function Log() {
      const { controlLog } = useAgentSurface();
      return (
        <ol aria-label="Control log">
          {controlLog.map((event) => (
            <li
              key={event.at + event.holder}
            >{`${event.previous}→${event.holder} ${event.by} ${typeof event.at}`}</li>
          ))}
        </ol>
      );
    }
    const apiRef = createRef<AgentSurfaceApi>();
    render(
      <AgentSurface apiRef={apiRef}>
        <Log />
      </AgentSurface>,
    );
    act(() => {
      apiRef.current?.grant();
    });
    act(() => {
      apiRef.current?.takeOver();
    });
    expect(
      Array.from(
        screen.getByRole("list", { name: "Control log" }).children,
        (li) => li.textContent,
      ),
    ).toEqual(["shared→agent app number", "agent→person person number"]);
  });

  it("marks a call's source when the caller says where it came from", async () => {
    const onToolCall = vi.fn();
    const { api } = setup({ onToolCall });
    await api().call("list", {}, { source: "webmcp" });
    expect(onToolCall).toHaveBeenLastCalledWith(expect.objectContaining({ source: "webmcp" }));
  });

  it("announces finished calls only when asked to", async () => {
    const quiet = setup({ agentName: "Claude" });
    await act(async () => {
      await quiet.api().call("sort", { column: "name" });
    });
    expect(quiet.status()).toBeEmptyDOMElement();
    quiet.unmount();

    const chatty = setup({ agentName: "Claude", announceCalls: true });
    await act(async () => {
      await chatty.api().call("sort", { column: "name" });
    });
    expect(chatty.status()).toHaveTextContent("Claude: Sorted deals by name.");
    await act(async () => {
      await chatty.api().call("sort", { column: "bad" });
    });
    expect(chatty.status()).toHaveTextContent("Claude: “Sort deals” was refused.");
  });

  describe("WebMCP", () => {
    function installModelContext() {
      const registered = new Map<
        string,
        { execute: (input: unknown, options?: { signal?: AbortSignal }) => Promise<unknown> }
      >();
      const registerTool = vi.fn(
        (
          tool: {
            name: string;
            execute: (input: unknown) => Promise<unknown>;
            annotations?: unknown;
          },
          options: { signal: AbortSignal },
        ) => {
          registered.set(tool.name, tool);
          options.signal.addEventListener("abort", () => registered.delete(tool.name));
          return Promise.resolve();
        },
      );
      Object.defineProperty(document, "modelContext", {
        value: { registerTool },
        configurable: true,
      });
      return { registered, registerTool };
    }

    it("exposes nothing to browser agents unless asked to", () => {
      const { registerTool } = installModelContext();
      setup();
      expect(registerTool).not.toHaveBeenCalled();
    });

    it("registers every tool, answers in MCP's shape, and marks refusals as errors", async () => {
      const { registered, registerTool } = installModelContext();
      setup({ webmcp: true, name: "deals" });
      expect([...registered.keys()]).toEqual(["deals_sort", "deals_list", "deals_delete"]);
      expect(registerTool.mock.calls[0]?.[0]).not.toHaveProperty("effect");

      let answer;
      await act(async () => {
        answer = await registered.get("deals_sort")?.execute({ column: "name" });
      });
      expect(answer).toEqual({ content: [{ type: "text", text: "Sorted by name, asc." }] });

      const listed = await registered.get("deals_list")?.execute({});
      expect(listed).toMatchObject({
        structuredContent: { deals: expect.any(Array) as unknown },
      });

      const refused = await registered.get("deals_delete")?.execute({ id: "a" });
      expect(refused).toMatchObject({ isError: true });
    });

    it("records a browser agent's calls as coming from WebMCP", async () => {
      const { registered } = installModelContext();
      const onToolCall = vi.fn();
      setup({ webmcp: true, onToolCall });
      await act(async () => {
        await registered.get("list")?.execute({});
      });
      expect(onToolCall).toHaveBeenLastCalledWith(
        expect.objectContaining({ source: "webmcp" }),
      );
    });

    it("keeps a tool marked webmcp: false for the app alone", () => {
      const { registered } = installModelContext();
      function AppOnly() {
        useAgentTool({ name: "local", description: "d", webmcp: false, execute: () => "" });
        return null;
      }
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface webmcp apiRef={apiRef}>
          <AppOnly />
        </AgentSurface>,
      );
      expect(registered.has("local")).toBe(false);
      expect(apiRef.current?.tools().map((tool) => tool.name)).toEqual(["local"]);
    });

    it("withdraws the tools when turned off, and on unmount", () => {
      const { registered } = installModelContext();
      const { rerender, unmount } = render(
        <AgentSurface webmcp>
          <Deals />
        </AgentSurface>,
      );
      expect(registered.size).toBe(3);
      rerender(
        <AgentSurface webmcp={false}>
          <Deals />
        </AgentSurface>,
      );
      expect(registered.size).toBe(0);
      rerender(
        <AgentSurface webmcp>
          <Deals />
        </AgentSurface>,
      );
      expect(registered.size).toBe(3);
      unmount();
      expect(registered.size).toBe(0);
    });

    it("passes exposedTo to the browser: the surface's, or a tool's own instead", () => {
      const { registerTool } = installModelContext();
      function Tools() {
        useAgentTool({
          name: "shared",
          description: "Uses the surface's list.",
          effect: "read",
          execute: () => "ok",
        });
        useAgentTool({
          name: "admin",
          description: "Has its own list.",
          effect: "read",
          exposedTo: ["https://admin.example.com"],
          execute: () => "ok",
        });
        return null;
      }
      render(
        <AgentSurface webmcp exposedTo={["https://app.example.com/embed"]}>
          <Tools />
        </AgentSurface>,
      );
      const optionsFor = (name: string) =>
        registerTool.mock.calls.filter(([tool]) => tool.name === name).at(-1)?.[1];
      expect(optionsFor("shared")).toMatchObject({ exposedTo: ["https://app.example.com"] });
      expect(optionsFor("admin")).toMatchObject({ exposedTo: ["https://admin.example.com"] });
    });

    it("marks a tool for developer tooling with WebMCP's debugging annotation", () => {
      const { registerTool } = installModelContext();
      function Inspector() {
        useAgentTool({
          name: "dump_state",
          description: "Returns the page's state, for debugging.",
          effect: "read",
          debugging: true,
          execute: () => "{}",
        });
        return null;
      }
      render(
        <AgentSurface webmcp>
          <Inspector />
        </AgentSurface>,
      );
      expect(registerTool.mock.calls.at(-1)?.[0].annotations).toMatchObject({
        debugging: true,
      });
    });

    it("re-registers a tool when what the agent is told about it changes", () => {
      const { registerTool } = installModelContext();
      const { rerender } = render(
        <AgentSurface webmcp>
          <Deals />
        </AgentSurface>,
      );
      const before = registerTool.mock.calls.length;
      rerender(
        <AgentSurface webmcp>
          <Deals />
        </AgentSurface>,
      );
      expect(registerTool.mock.calls.length).toBe(before);
      rerender(
        <AgentSurface webmcp>
          <Deals describe="Sort by any column." />
        </AgentSurface>,
      );
      expect(registerTool.mock.calls.length).toBe(before + 1);
    });
  });

  it("throws a clear error when a hook is used outside a surface", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Orphan() {
      useAgentSurface();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/inside <AgentSurface>/);
  });

  it("lets className override its own utilities", () => {
    const { surface } = setup({ className: "rounded-none" });
    expect(surface()).toHaveClass("rounded-none");
    expect(surface()).not.toHaveClass("rounded-lg");
  });

  it("forwards ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AgentSurface ref={ref} data-testid="root" />);
    expect(ref.current).toBe(screen.getByTestId("root"));
  });

  it("has no detectable accessibility violations while the agent drives", async () => {
    const { container, api } = setup({ defaultHolder: "agent" });
    await act(async () => {
      await api().call("sort", { column: "name" });
    });
    await expectNoA11yViolations(container);
  });
});
