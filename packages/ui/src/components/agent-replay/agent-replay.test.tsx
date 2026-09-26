import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AgentSurface,
  useAgentTool,
  type AgentSurfaceApi,
  type AgentToolCall,
  type ControlEvent,
} from "../agent-surface";
import { AgentReplay, describeControl, replaySteps } from "./agent-replay";

function call(id: string, at: number, overrides: Partial<AgentToolCall> = {}): AgentToolCall {
  return {
    id,
    tool: id,
    title: `Do ${id}`,
    summary: `Did ${id}`,
    input: { n: at },
    source: "app",
    status: "done",
    effect: "write",
    reversibility: "revertible",
    undoable: false,
    startedAt: at,
    finishedAt: at + 1,
    told: `Told about ${id}`,
    ...overrides,
  };
}

const CALLS = [
  call("sort", 1000),
  call("email", 5000, {
    status: "refused",
    title: "Email owners",
    told: "The person has taken control of this page.",
  }),
  call("select", 9000, { source: "webmcp", edited: ["ids"], undo: "reverted" }),
];

const CONTROL: ControlEvent[] = [
  { holder: "agent", previous: "shared", by: "app", at: 500 },
  { holder: "person", previous: "agent", by: "person", at: 3000 },
  { holder: "agent", previous: "person", by: "person", note: "Only Echo", at: 7000 },
];

function stepList(): string[] {
  return Array.from(
    screen.getByRole("list", { name: "Steps" }).querySelectorAll("button"),
    (button) => button.textContent,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("replaySteps", () => {
  it("lays calls and changes of control on one timeline", () => {
    expect(replaySteps(CALLS, CONTROL).map((step) => step.id)).toEqual([
      "control-0",
      "sort",
      "control-1",
      "email",
      "control-2",
      "select",
    ]);
  });
});

describe("describeControl", () => {
  it("says who did what", () => {
    const at = 0;
    expect(
      describeControl({ holder: "agent", previous: "shared", by: "app", at }, "Claude"),
    ).toBe("Claude started.");
    expect(
      describeControl({ holder: "person", previous: "agent", by: "person", at }, "Claude"),
    ).toBe("You took over. Claude paused.");
    expect(
      describeControl(
        { holder: "person", previous: "agent", by: "agent", reason: "Sign in", at },
        "Claude",
      ),
    ).toBe("Claude handed over: Sign in");
    expect(
      describeControl(
        { holder: "agent", previous: "person", by: "person", note: "Go", at },
        "Claude",
      ),
    ).toBe("You handed back, with a note: “Go”");
    expect(
      describeControl({ holder: "shared", previous: "person", by: "person", at }, "Claude"),
    ).toBe("You handed back.");
    expect(
      describeControl({ holder: "shared", previous: "agent", by: "app", at }, "Claude"),
    ).toBe("Claude finished.");
  });
});

describe("AgentReplay", () => {
  function setup(props: Partial<Parameters<typeof AgentReplay>[0]> = {}) {
    return render(
      <AgentReplay
        calls={CALLS}
        controlLog={CONTROL}
        agentName="Claude"
        formatTime={(ms) => `t${String(ms)}`}
        {...props}
      />,
    );
  }

  it("shows only time since the start unless given a clock format, so it hydrates cleanly", () => {
    render(<AgentReplay calls={CALLS} controlLog={CONTROL} />);
    expect(screen.getByText(/Step 1 of 6 ·/)).toHaveTextContent("Step 1 of 6 · +0:00");
    expect(screen.getByText("+0:00")).toHaveAttribute("datetime", new Date(500).toISOString());
  });

  it("says so when there is nothing to replay", () => {
    render(<AgentReplay calls={[]} controlLog={[]} />);
    expect(screen.getByText("Nothing to replay yet.")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("lists every step, calls and control alike, marking the current one", () => {
    setup();
    expect(stepList()).toEqual([
      "1.Claude started.Control",
      "2.Did sortDone",
      "3.You took over. Claude paused.Control",
      "4.Email owners: refusedRefused",
      "5.You handed back, with a note: “Only Echo”Control",
      "6.Did selectDone",
    ]);
    expect(screen.getByRole("button", { name: /1\.Claude started/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("shows a call's arguments, outcome and exactly what the agent was told", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /4\.Email owners/ }));
    const detail = screen.getByRole("article");
    expect(detail).toHaveTextContent("Email owners: refused");
    expect(detail).toHaveTextContent("Refused · Called by the app's assistant");
    expect(screen.getByRole("region", { name: "What the agent was told" })).toHaveTextContent(
      "The person has taken control of this page.",
    );
    expect(screen.getByRole("region", { name: "Arguments" })).toHaveTextContent('"n": 5000');
  });

  it("says when a call came from a browser agent, was corrected, or was undone", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Last" }));
    expect(screen.getByRole("article")).toHaveTextContent(
      "Done · Called by a browser agent · You corrected ids before approving · Undone afterwards",
    );
  });

  it("moves with First, Previous, Next and Last, and says where it is", () => {
    setup();
    expect(screen.getByRole("button", { name: "First" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(/Step 2 of 6 · t1000/)).toHaveTextContent(
      "Step 2 of 6 · t1000 · +0:01",
    );
    fireEvent.click(screen.getByRole("button", { name: "Last" }));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("article")).toHaveTextContent(
      "You handed back, with a note: “Only Echo”",
    );
    fireEvent.click(screen.getByRole("button", { name: "First" }));
    expect(screen.getByRole("article")).toHaveTextContent("Claude started.");
  });

  it("moves with the slider, which names the step it lands on", () => {
    setup();
    const slider = screen.getByRole("slider", { name: "Step" });
    fireEvent.change(slider, { target: { value: "3" } });
    expect(slider).toHaveAttribute(
      "aria-valuetext",
      "Step 3 of 6: You took over. Claude paused.",
    );
  });

  it("announces the step moved to, from a region present from the start", () => {
    const { container } = setup();
    const status = container.querySelector("[data-slot='agent-replay-status']");
    expect(status).toHaveAttribute("role", "status");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(status).toHaveTextContent("Step 2 of 6: Did sort");
  });

  it("plays one step per interval, quietly, and stops at the end", () => {
    vi.useFakeTimers();
    const { container } = setup({ interval: 1000 });
    const play = screen.getByRole("button", { name: "Play" });
    fireEvent.click(play);
    expect(play).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("[data-slot='agent-replay-status']")).toBeEmptyDOMElement();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("article")).toHaveTextContent("Did sort");

    // One tick per step: each step's timer is set once the last has rendered.
    for (let i = 0; i < 8; i += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByRole("article")).toHaveTextContent("Did select");
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Play" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("pauses, and stepping by hand stops playback", () => {
    vi.useFakeTimers();
    setup({ interval: 1000 });
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("article")).toHaveTextContent("Claude started.");

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("article")).toHaveTextContent("Did sort");
  });

  it("leaves out what include rejects", () => {
    setup({ include: (step) => step.kind === "call" });
    expect(stepList()).toHaveLength(3);
  });

  it("renders more for a step when asked", () => {
    setup({ renderStep: (step) => <p>Snapshot of {step.id}</p> });
    expect(screen.getByText("Snapshot of control-0")).toBeInTheDocument();
  });

  it("replays the surface it is inside by default", async () => {
    function Tool() {
      useAgentTool({
        name: "list",
        description: "Lists.",
        effect: "read",
        execute: () => "3 rows",
      });
      return null;
    }
    const apiRef = createRef<AgentSurfaceApi>();
    render(
      <AgentSurface apiRef={apiRef} agentName="Claude">
        <Tool />
        <AgentReplay />
      </AgentSurface>,
    );
    act(() => {
      apiRef.current?.grant();
    });
    await act(async () => {
      await apiRef.current?.call("list");
    });
    expect(stepList()).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Last" }));
    expect(screen.getByRole("region", { name: "What the agent was told" })).toHaveTextContent(
      "3 rows",
    );
  });

  it("takes a heading, and lets className override its utilities", () => {
    setup({ heading: "How it went", className: "p-6" });
    const section = screen.getByRole("region", { name: "How it went" });
    expect(section).toHaveClass("p-6");
    expect(section).not.toHaveClass("p-4");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLElement>();
    setup({ ref });
    expect(ref.current?.dataset.slot).toBe("agent-replay");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = setup();
    fireEvent.click(screen.getByRole("button", { name: /4\.Email owners/ }));
    await expectNoA11yViolations(container);
  });
});
