import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AgentSurface,
  useAgentTool,
  type AgentSurfaceApi,
  type AgentSurfaceProps,
} from "../agent-surface";
import { ControlBaton } from "./control-baton";

function Tool() {
  useAgentTool({
    name: "list",
    title: "Read deals",
    description: "Lists things.",
    effect: "read",
    describe: () => "Read the deals",
    execute: () => "3 deals",
  });
  useAgentTool({
    name: "fail",
    title: "Export deals",
    description: "Always fails.",
    effect: "read",
    execute: () => {
      throw new Error("nope");
    },
  });
  return <button type="button">Inside</button>;
}

function setup(
  props: Partial<AgentSurfaceProps> = {},
  baton: Parameters<typeof ControlBaton>[0] = {},
) {
  const apiRef = createRef<AgentSurfaceApi>();
  const utils = render(
    <AgentSurface apiRef={apiRef} agentName="Claude" {...props}>
      <ControlBaton {...baton} />
      <Tool />
    </AgentSurface>,
  );
  const api = () => {
    if (!apiRef.current) throw new Error("no api");
    return apiRef.current;
  };
  return { ...utils, api };
}

const group = () => screen.getByRole("group", { name: "Control of this page" });
const action = () =>
  group().querySelector<HTMLButtonElement>("[data-slot='control-baton-action']");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ControlBaton", () => {
  describe("inside a surface", () => {
    it("states who has control in words, for each holder", () => {
      const { api } = setup();
      expect(group()).toHaveTextContent("Claude can act on this page");
      expect(action()).toHaveTextContent("Pause Claude");

      act(() => {
        api().grant();
      });
      expect(group()).toHaveTextContent("Claude is working");
      expect(action()).toHaveTextContent("Take over");

      act(() => {
        api().takeOver();
      });
      expect(group()).toHaveTextContent("You have control. Claude is paused");
      expect(action()).toHaveTextContent("Hand back…");
    });

    it("says what the agent needs when it handed over", () => {
      const { api } = setup({ defaultHolder: "agent" });
      act(() => {
        api().handOver("Sign in to continue");
      });
      expect(group()).toHaveTextContent("Claude needs you: Sign in to continue");
    });

    it("leaves announcing to the surface, so nothing is said twice", () => {
      setup();
      const status = group().querySelector("[data-slot='control-baton-status']");
      expect(status).not.toHaveAttribute("role");
    });

    it("takes over from its button, and focus stays on it", async () => {
      const user = userEvent.setup();
      const { api } = setup({ defaultHolder: "agent" });
      await user.click(screen.getByRole("button", { name: "Take over" }));
      expect(api().getHolder()).toBe("person");
      // Using the baton is not taking over "by input" twice — it is the same act.
      expect(screen.getByRole("button", { name: "Hand back…" })).toHaveFocus();
    });

    it("pauses an agent that can act on the page", async () => {
      const user = userEvent.setup();
      const { api } = setup();
      await user.click(screen.getByRole("button", { name: "Pause Claude" }));
      expect(api().getHolder()).toBe("person");
    });

    it("hands back with a note the agent receives", async () => {
      const user = userEvent.setup();
      const onHandBack = vi.fn();
      const { api } = setup({ defaultHolder: "agent" }, { onHandBack });
      act(() => {
        api().takeOver();
      });

      await user.click(screen.getByRole("button", { name: "Hand back…" }));
      const note = screen.getByRole("textbox", {
        name: "Anything Claude should know? (optional)",
      });
      expect(note).toHaveFocus();

      await user.type(note, "Signed in, continue");
      await user.click(screen.getByRole("button", { name: "Hand back" }));

      expect(onHandBack).toHaveBeenCalledWith("Signed in, continue");
      expect(api().getHolder()).toBe("agent");
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Take over" })).toHaveFocus();

      const result = await api().call("list");
      expect(result.text).toContain('"Signed in, continue"');
    });

    it("hands back with Ctrl or ⌘+Enter, and with no note when left empty", async () => {
      const user = userEvent.setup();
      const onHandBack = vi.fn();
      const { api } = setup({ defaultHolder: "person" }, { onHandBack });
      await user.click(screen.getByRole("button", { name: "Hand back…" }));
      await user.keyboard("{Control>}{Enter}{/Control}");
      expect(onHandBack).toHaveBeenCalledWith(undefined);
      expect(api().getHolder()).toBe("shared");
    });

    it("cancels with Escape or the Cancel button, returning focus", async () => {
      const user = userEvent.setup();
      const { api } = setup({ defaultHolder: "person" });

      await user.click(screen.getByRole("button", { name: "Hand back…" }));
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hand back…" })).toHaveFocus();

      await user.click(screen.getByRole("button", { name: "Hand back…" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.getByRole("button", { name: "Hand back…" })).toHaveFocus();
      expect(api().getHolder()).toBe("person");
    });

    it("hands back in one click with the note turned off", async () => {
      const user = userEvent.setup();
      const { api } = setup({ defaultHolder: "person" }, { note: "off" });
      await user.click(screen.getByRole("button", { name: "Hand back…" }));
      expect(api().getHolder()).toBe("shared");
    });

    it("closes the note, and keeps focus, if control moves elsewhere meanwhile", async () => {
      const user = userEvent.setup();
      const { api } = setup({ defaultHolder: "person" });
      await user.click(screen.getByRole("button", { name: "Hand back…" }));
      expect(screen.getByRole("textbox")).toHaveFocus();

      act(() => {
        api().grant();
      });
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Take over" })).toHaveFocus();
    });

    it("shows the agent's latest call, and its outcome when it did not succeed", async () => {
      const { api } = setup({ defaultHolder: "agent" });
      await act(async () => {
        await api().call("list");
      });
      expect(group()).toHaveTextContent("Read the deals");

      await act(async () => {
        await api().call("fail");
      });
      expect(group()).toHaveTextContent("Export deals (failed)");

      act(() => {
        api().takeOver();
      });
      // While the person holds control, what the agent did last is not news.
      expect(group()).not.toHaveTextContent("Export deals");
    });

    it("lets activity be overridden", () => {
      setup({}, { activity: "Filling the shipping form" });
      expect(group()).toHaveTextContent("Filling the shipping form");
    });

    it("never counts as taking over by input, so one click is one change", async () => {
      const user = userEvent.setup();
      const onControlChange = vi.fn();
      setup({ defaultHolder: "agent", onControlChange });
      await user.click(screen.getByRole("button", { name: "Take over" }));
      expect(onControlChange).toHaveBeenCalledOnce();
      expect(onControlChange).toHaveBeenCalledWith(
        expect.objectContaining({ holder: "person", by: "person" }),
      );
    });
  });

  describe("on its own", () => {
    it("requires a holder outside a surface", () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      expect(() => render(<ControlBaton />)).toThrow(/needs a holder/);
    });

    it("announces changes itself through a region present from first paint", () => {
      const { rerender } = render(<ControlBaton holder="agent" agentName="Operator" />);
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Operator is working");
      rerender(
        <ControlBaton holder="person" agentName="Operator" reason="Solve the CAPTCHA" />,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Operator needs you: Solve the CAPTCHA",
      );
    });

    it("reports the person's choices to the parent", async () => {
      const user = userEvent.setup();
      const onTakeOver = vi.fn();
      const onHandBack = vi.fn();
      const { rerender } = render(
        <ControlBaton holder="agent" onTakeOver={onTakeOver} onHandBack={onHandBack} />,
      );
      await user.click(screen.getByRole("button", { name: "Take over" }));
      expect(onTakeOver).toHaveBeenCalledOnce();

      rerender(
        <ControlBaton holder="person" onTakeOver={onTakeOver} onHandBack={onHandBack} />,
      );
      await user.click(screen.getByRole("button", { name: "Hand back…" }));
      await user.type(screen.getByRole("textbox"), "done");
      await user.click(screen.getByRole("button", { name: "Hand back" }));
      expect(onHandBack).toHaveBeenCalledWith("done");
    });

    it("can be told not to announce", () => {
      render(<ControlBaton holder="agent" announce={false} />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("marks itself so surfaces can tell it apart from the controls they watch", () => {
    setup();
    expect(group()).toHaveAttribute("data-agent-ui");
    expect(group()).toHaveAttribute("data-holder", "shared");
  });

  it("takes custom labels", () => {
    render(
      <ControlBaton
        holder="agent"
        labels={{ takeOver: "Prendre la main", group: "Contrôle" }}
      />,
    );
    expect(screen.getByRole("group", { name: "Contrôle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prendre la main" })).toBeInTheDocument();
  });

  it("has a compact size", () => {
    render(<ControlBaton holder="agent" size="compact" />);
    expect(group()).toHaveClass("text-xs");
  });

  it("lets className override its own utilities", () => {
    render(<ControlBaton holder="agent" className="rounded-none" />);
    expect(group()).toHaveClass("rounded-none");
    expect(group()).not.toHaveClass("rounded-lg");
  });

  it("forwards ref and native props", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ControlBaton ref={ref} holder="agent" data-testid="baton" />);
    expect(ref.current).toBe(screen.getByTestId("baton"));
  });

  it("works from the keyboard alone", () => {
    const { api } = setup({ defaultHolder: "agent" });
    const button = screen.getByRole("button", { name: "Take over" });
    button.focus();
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
    expect(api().getHolder()).toBe("person");
  });

  it("has no detectable accessibility violations in any state", async () => {
    const user = userEvent.setup();
    const { container, api } = setup({ defaultHolder: "agent" });
    await expectNoA11yViolations(container);
    act(() => {
      api().handOver("Sign in to continue");
    });
    await user.click(screen.getByRole("button", { name: "Hand back…" }));
    await expectNoA11yViolations(container);
  });
});
