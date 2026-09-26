import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AgentSurface, useAgentTool, type AgentSurfaceApi } from "../agent-surface";
import { SuggestMode, describeReview } from "./ai-suggest-mode";
import type { SuggestedEdit } from "./suggest-hunks";

const TEXT = "Teh launch is planned for next week, and we will utilise every channel.";
const EDITS: SuggestedEdit[] = [
  { id: "typo", find: "Teh", replace: "The", reason: "Spelling" },
  { id: "plain", find: "utilise", replace: "use", reason: "Plainer word" },
  { id: "date", find: "next week", replace: "on 3 October", reason: "Be specific" },
];

function items() {
  return screen.getAllByRole("listitem");
}

describe("SuggestMode", () => {
  it("lists each suggestion in words, with its reason and status", () => {
    render(<SuggestMode value={TEXT} edits={EDITS} author="Claude" />);
    const list = screen.getByRole("list", { name: "Claude's suggestions" });
    expect(list).toBeInTheDocument();
    expect(items().map((item) => item.querySelector("p")?.textContent)).toEqual([
      "1. Replace “Teh” with “The”",
      "2. Replace “next week” with “on 3 October”",
      "3. Replace “utilise” with “use”",
    ]);
    expect(items()[0]).toHaveTextContent("Why: Spelling");
    expect(items()[0]).toHaveTextContent("Waiting");
  });

  it("shows each change where it would go, named in words", () => {
    render(<SuggestMode value={TEXT} edits={EDITS} />);
    const change = screen.getByRole("link", { name: "Suggestion 1: Replace “Teh” with “The”" });
    expect(change.querySelector("del")).toHaveTextContent("Teh");
    expect(change.querySelector("ins")).toHaveTextContent("The");
  });

  it("applies only what is accepted, and reports the text as it goes", async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    render(<SuggestMode value={TEXT} edits={EDITS} onTextChange={onTextChange} />);
    const [first] = items();
    await user.click(first!.querySelector("button")!);
    expect(onTextChange).toHaveBeenLastCalledWith(
      "The launch is planned for next week, and we will utilise every channel.",
    );
    expect(items()[0]).toHaveTextContent("Accepted");
  });

  it("moves focus to the next suggestion waiting, then to a summary", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SuggestMode value={TEXT} edits={EDITS} onComplete={onComplete} />);
    await user.click(screen.getAllByRole("button", { name: "Accept" })[0]!);
    expect(screen.getAllByRole("button", { name: "Accept" })[0]).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Reject", description: /next week/ }));
    await user.click(screen.getByRole("button", { name: "Accept", description: /utilise/ }));

    const done = screen.getByText("All 3 reviewed: 2 accepted, 1 rejected.");
    expect(done).toHaveFocus();
    expect(onComplete).toHaveBeenCalledWith(
      "The launch is planned for next week, and we will use every channel.",
      expect.objectContaining({
        accepted: [
          expect.objectContaining({ id: "typo" }),
          expect.objectContaining({ id: "plain" }),
        ],
        rejected: [expect.objectContaining({ id: "date" })],
      }),
    );
  });

  it("decides with A and R on the focused suggestion", async () => {
    const user = userEvent.setup();
    render(<SuggestMode value={TEXT} edits={EDITS} />);
    screen.getAllByRole("button", { name: "Accept" })[0]!.focus();
    await user.keyboard("r");
    expect(items()[0]).toHaveTextContent("Rejected");
    await user.keyboard("a");
    expect(items()[1]).toHaveTextContent("Accepted");
  });

  it("can undo a decision", async () => {
    const user = userEvent.setup();
    render(<SuggestMode value={TEXT} edits={EDITS} />);
    await user.click(screen.getAllByRole("button", { name: "Reject" })[0]!);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(items()[0]).toHaveTextContent("Waiting");
  });

  it("accepts or rejects everything waiting at once", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SuggestMode value={TEXT} edits={EDITS} onComplete={onComplete} />);
    await user.click(screen.getAllByRole("button", { name: "Reject" })[1]!);
    await user.click(screen.getByRole("button", { name: "Accept all 2" }));
    expect(onComplete).toHaveBeenCalledWith(
      "The launch is planned for next week, and we will use every channel.",
      expect.anything(),
    );
    expect(screen.queryByRole("button", { name: /all/ })).not.toBeInTheDocument();
  });

  it("follows a link in the text to that suggestion's controls", async () => {
    const user = userEvent.setup();
    render(<SuggestMode value={TEXT} edits={EDITS} />);
    await user.click(screen.getByRole("link", { name: /Suggestion 3/ }));
    expect(
      screen.getByRole("button", { name: "Accept", description: /utilise/ }),
    ).toHaveFocus();
  });

  it("says how many are waiting, from a region present from the start", async () => {
    const user = userEvent.setup();
    render(<SuggestMode value={TEXT} edits={EDITS} />);
    const count = screen.getByRole("status");
    expect(count).toHaveTextContent("3 of 3 waiting");
    await user.click(screen.getAllByRole("button", { name: "Accept" })[0]!);
    expect(count).toHaveTextContent("2 of 3 waiting");
  });

  it("diffs a whole rewrite", () => {
    render(<SuggestMode value="The quick fox." rewrite="The swift fox." />);
    expect(
      screen.getByRole("link", { name: "Suggestion 1: Replace “quick” with “swift”" }),
    ).toBeInTheDocument();
  });

  it("says which edits could not be placed", () => {
    render(
      <SuggestMode value={TEXT} edits={[...EDITS, { find: "tomorrow", replace: "today" }]} />,
    );
    expect(screen.getByText(/1 suggestion could not be placed/)).toHaveTextContent(
      "“tomorrow”",
    );
  });

  it("says when there is nothing to review", () => {
    render(<SuggestMode value={TEXT} rewrite={TEXT} />);
    expect(screen.getByRole("status")).toHaveTextContent("No suggestions.");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onDecisionsChange = vi.fn();
    render(
      <SuggestMode
        value={TEXT}
        edits={EDITS}
        decisions={{ typo: "accepted" }}
        onDecisionsChange={onDecisionsChange}
      />,
    );
    expect(items()[0]).toHaveTextContent("Accepted");
    await user.click(screen.getAllByRole("button", { name: "Accept" })[0]!);
    expect(onDecisionsChange).toHaveBeenCalledWith({ typo: "accepted", date: "accepted" });
    // Controlled: the parent has not agreed yet.
    expect(items()[1]).toHaveTextContent("Waiting");
  });

  it("tells the surface's agent what was decided, once everything is", async () => {
    const user = userEvent.setup();
    function Tool() {
      useAgentTool({
        name: "read",
        description: "Reads.",
        effect: "read",
        execute: () => "ok",
      });
      return null;
    }
    const apiRef = createRef<AgentSurfaceApi>();
    render(
      <AgentSurface apiRef={apiRef}>
        <Tool />
        <SuggestMode value={TEXT} edits={EDITS.slice(0, 2)} />
      </AgentSurface>,
    );
    await user.click(screen.getAllByRole("button", { name: "Accept" })[0]!);
    await user.click(screen.getByRole("button", { name: "Reject" }));
    let told = "";
    await act(async () => {
      told = (await apiRef.current?.call("read"))?.text ?? "";
    });
    expect(told).toContain("accepted 1, rejected 1");
    expect(told).toContain("Rejected — do not suggest again: Replace “utilise” with “use”.");
  });

  it("keeps quiet to the agent when asked to", async () => {
    const user = userEvent.setup();
    function Tool() {
      useAgentTool({
        name: "read",
        description: "Reads.",
        effect: "read",
        execute: () => "ok",
      });
      return null;
    }
    const apiRef = createRef<AgentSurfaceApi>();
    render(
      <AgentSurface apiRef={apiRef}>
        <Tool />
        <SuggestMode value={TEXT} edits={EDITS.slice(0, 1)} notifyAgent={false} />
      </AgentSurface>,
    );
    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect((await apiRef.current?.call("read"))?.text).toBe("ok");
  });

  it("lets className override its own utilities, and forwards ref", () => {
    const ref = createRef<HTMLElement>();
    render(<SuggestMode ref={ref} value={TEXT} edits={EDITS} className="p-6" />);
    expect(ref.current).toHaveClass("p-6");
    expect(ref.current).not.toHaveClass("p-4");
  });

  it("has no detectable accessibility violations, waiting or decided", async () => {
    const user = userEvent.setup();
    const { container } = render(<SuggestMode value={TEXT} edits={EDITS} />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Accept all 3" }));
    await expectNoA11yViolations(container);
  });
});

describe("describeReview", () => {
  it("says what was accepted and what not to suggest again", () => {
    const base = { start: 0, end: 0 };
    expect(
      describeReview({
        accepted: [{ ...base, id: "a", removed: "teh", added: "the" }],
        rejected: [],
      }),
    ).toBe(
      "The person reviewed your 1 suggested change: accepted 1, rejected 0.\nAccepted: Replace “teh” with “the”.",
    );
  });
});
