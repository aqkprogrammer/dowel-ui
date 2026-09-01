import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AgentStatus, type AgentState } from "./ai-agent-status";

describe("AgentStatus", () => {
  it.each([
    ["idle", "Idle"],
    ["thinking", "Thinking"],
    ["working", "Working"],
    ["waiting", "Waiting for input"],
    ["done", "Done"],
    ["error", "Error"],
  ] as [AgentState, string][])("states %s in words", (state, label) => {
    render(<AgentStatus state={state} />);
    // Agent states matter most when something has failed — exactly when a
    // colour-only signal fails the people who most need to notice.
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("accepts custom wording", () => {
    render(<AgentStatus state="working" label="Indexing 412 files" />);
    expect(screen.getByText("Indexing 412 files")).toBeInTheDocument();
  });

  it("marks the state for styling", () => {
    const { container } = render(<AgentStatus state="error" />);
    expect(container.firstElementChild).toHaveAttribute("data-state", "error");
  });

  it("does not announce by default", () => {
    // Several agents each announcing their transitions turns a dashboard into
    // noise.
    render(<AgentStatus state="working" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces politely when asked", () => {
    render(<AgentStatus state="working" live />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Working");
  });

  it("hides its dot from assistive technology", () => {
    const { container } = render(<AgentStatus state="done" />);
    expect(container.querySelector("span[aria-hidden='true']")).toBeInTheDocument();
  });

  it("lets a consumer className override a conflicting utility", () => {
    const { container } = render(<AgentStatus state="idle" className="text-base" />);
    expect(container.firstElementChild).toHaveClass("text-base");
    expect(container.firstElementChild).not.toHaveClass("text-xs");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <div>
        <AgentStatus state="working" />
        <AgentStatus state="error" />
      </div>,
    );
    await expectNoA11yViolations(container);
  });
});
