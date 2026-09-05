import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AiWorkspaceBlock,
  type WorkspaceAttachment,
  type WorkspaceMessage,
  type WorkspaceThread,
} from "./ai-workspace";

const THREADS: WorkspaceThread[] = [
  { id: "t1", title: "Contract review", at: "2026-03-04T09:00:00Z", label: "2h" },
  { id: "t2", title: "Q3 forecast", at: "2026-03-03T15:00:00Z", label: "1d" },
];

const MESSAGES: WorkspaceMessage[] = [
  { id: "m1", from: "user", content: "Summarise the termination clause." },
  {
    id: "m2",
    from: "assistant",
    content: "Either party may terminate with 90 days' notice.",
    reasoning: "The clause is in section 14.2.",
    tools: [
      {
        id: "tool-1",
        name: "search_document",
        status: "success",
        arguments: '{"query":"termination"}',
        result: "Section 14.2",
      },
    ],
    sources: [{ index: 1, title: "Contract.pdf", origin: "Page 14", href: "#p14" }],
    tokens: 412,
  },
];

const ATTACHMENTS: WorkspaceAttachment[] = [
  { id: "f1", name: "Contract.pdf", detail: "PDF · 2.4 MB", href: "#f1" },
  { id: "f2", name: "Amendment.docx", detail: "Word · 120 KB" },
];

const BASE = { threads: THREADS, activeThread: "t1", messages: MESSAGES };

describe("AiWorkspaceBlock", () => {
  it("names all three landmarks", () => {
    render(<AiWorkspaceBlock {...BASE} tokensUsed={12_000} tokenLimit={200_000} />);

    expect(screen.getAllByRole("navigation", { name: "Conversations" }).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Context" })).toBeInTheDocument();
  });

  it("omits the context column when there is nothing to put in it", () => {
    render(<AiWorkspaceBlock {...BASE} />);
    expect(screen.queryByRole("complementary", { name: "Context" })).not.toBeInTheDocument();
  });

  it("titles the page after the active conversation", () => {
    render(<AiWorkspaceBlock {...BASE} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Contract review" }),
    ).toBeInTheDocument();
  });

  it("marks the active conversation and switches on click", async () => {
    const user = userEvent.setup();
    const onSelectThread = vi.fn();
    render(<AiWorkspaceBlock {...BASE} onSelectThread={onSelectThread} />);

    const nav = screen.getAllByRole("navigation", { name: "Conversations" })[0] as HTMLElement;
    expect(within(nav).getByRole("link", { name: /Contract review/ })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await user.click(within(nav).getByRole("link", { name: /Q3 forecast/ }));
    expect(onSelectThread).toHaveBeenCalledWith("t2");
  });

  it("renders the transcript as a list, never as a live region", () => {
    const { container } = render(<AiWorkspaceBlock {...BASE} busy />);

    expect(
      screen.getByText("Either party may terminate with 90 days' notice."),
    ).toBeInTheDocument();
    const lives = [...container.querySelectorAll("[aria-live]")].filter(
      (element) => element.getAttribute("aria-live") !== "off",
    );
    // Exactly one: the status line, which carries state and never content.
    expect(lives).toHaveLength(1);
    expect(lives[0]).toHaveTextContent("Generating response");
  });

  it("shows reasoning, tool calls and sources from the components that own them", () => {
    render(<AiWorkspaceBlock {...BASE} />);

    expect(screen.getByText("search_document")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1 source/ })).toBeInTheDocument();
  });

  it("sends a trimmed draft and clears the composer", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<AiWorkspaceBlock {...BASE} onSend={onSend} />);

    const box = screen.getByRole("textbox", { name: "Message" });
    await user.type(box, "  What about renewal?  ");
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("What about renewal?");
    expect(box).toHaveValue("");
  });

  it("does not send an empty message", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<AiWorkspaceBlock {...BASE} onSend={onSend} />);

    await user.type(screen.getByRole("textbox", { name: "Message" }), "   {Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("states how much of the window is spent, as numbers", () => {
    render(<AiWorkspaceBlock {...BASE} tokensUsed={150_000} tokenLimit={200_000} />);
    expect(screen.getByText("Context used")).toBeInTheDocument();
    expect(screen.getByText("150,000 / 200,000")).toBeInTheDocument();
  });

  it("names each attachment's remove button after its file", async () => {
    const user = userEvent.setup();
    const onRemoveAttachment = vi.fn();
    render(
      <AiWorkspaceBlock
        {...BASE}
        attachments={ATTACHMENTS}
        onRemoveAttachment={onRemoveAttachment}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove Amendment.docx" }));
    expect(onRemoveAttachment).toHaveBeenCalledWith(expect.objectContaining({ id: "f2" }));
    expect(screen.getByRole("link", { name: "Contract.pdf" })).toHaveAttribute("href", "#f1");
  });

  it("says plainly when nothing is attached", () => {
    render(<AiWorkspaceBlock {...BASE} onAttach={() => undefined} />);
    expect(screen.getByText(/Nothing attached/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach" })).toBeInTheDocument();
  });

  it("shows a structured result beside the conversation", () => {
    render(
      <AiWorkspaceBlock
        {...BASE}
        output={{
          title: "Extracted terms",
          fields: [
            { name: "notice", label: "Notice period" },
            { name: "governingLaw", label: "Governing law" },
          ],
          value: { notice: "90 days" },
          streaming: true,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Extracted terms" })).toBeInTheDocument();
    expect(screen.getByText("Notice period")).toBeInTheDocument();
    expect(screen.getByText("90 days")).toBeInTheDocument();
  });

  it("offers a new conversation only when something handles it", () => {
    const { rerender } = render(<AiWorkspaceBlock {...BASE} />);
    expect(screen.queryByRole("button", { name: "New conversation" })).not.toBeInTheDocument();

    rerender(<AiWorkspaceBlock {...BASE} onNewThread={() => undefined} />);
    expect(screen.getByRole("button", { name: "New conversation" })).toBeInTheDocument();
  });

  it("explains an empty transcript", () => {
    render(<AiWorkspaceBlock threads={[]} messages={[]} />);
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <AiWorkspaceBlock
        {...BASE}
        onNewThread={() => undefined}
        onSelectThread={() => undefined}
        onSend={() => undefined}
        models={[
          { id: "sonnet", name: "Sonnet" },
          { id: "opus", name: "Opus" },
        ]}
        model="sonnet"
        tokensUsed={12_000}
        tokenLimit={200_000}
        attachments={ATTACHMENTS}
        onAttach={() => undefined}
        onRemoveAttachment={() => undefined}
        output={{
          fields: [{ name: "notice", label: "Notice period" }],
          value: { notice: "90 days" },
        }}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
