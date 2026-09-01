import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { AiChatBlock, type ChatMessage } from "./ai-chat";

const MESSAGES: ChatMessage[] = [
  { id: "1", from: "user", content: "How do I make an overflowing table keyboard-scrollable?" },
  {
    id: "2",
    from: "assistant",
    content: 'Give the scrolling wrapper tabindex="0", a role and an accessible name.',
    reasoning: "The container is not focusable by default, so its overflow is unreachable.",
    tools: [
      {
        id: "t1",
        name: "search_docs",
        status: "success",
        arguments: '{ "query": "scrollable region" }',
        result: '{ "hits": 3 }',
      },
    ],
    sources: [{ index: 1, title: "ARIA Authoring Practices", origin: "w3.org", href: "#1" }],
    tokens: 148,
  },
];

describe("AiChatBlock", () => {
  it("shows an empty state before anything is said", () => {
    render(<AiChatBlock messages={[]} />);
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
  });

  it("renders the transcript as a list, never a live region", () => {
    const { container } = render(<AiChatBlock messages={MESSAGES} />);

    const list = container.querySelector("[data-slot='conversation-messages']");
    expect(list?.tagName).toBe("OL");
    // The decision the whole AI layer rests on: announcing streamed text token
    // by token is unusable with a screen reader.
    expect(list).not.toHaveAttribute("aria-live");
  });

  it("names the speaker of every turn in text", () => {
    render(<AiChatBlock messages={MESSAGES} />);
    expect(screen.getByText("You said:")).toBeInTheDocument();
    expect(screen.getByText("Assistant said:")).toBeInTheDocument();
  });

  it("announces state, not content", () => {
    const { container } = render(<AiChatBlock messages={MESSAGES} busy />);

    const status = container.querySelector("[data-slot='conversation-status']");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Generating response");
    expect(status).not.toHaveTextContent("tabindex");
  });

  it("distinguishes waiting from generating", () => {
    const { container } = render(<AiChatBlock messages={MESSAGES} waiting />);
    expect(container.querySelector("[data-slot='conversation-status']")).toHaveTextContent(
      "Waiting for a response",
    );
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("collapses reasoning and tool calls by default", () => {
    render(<AiChatBlock messages={MESSAGES} />);

    expect(screen.getByRole("button", { name: "Reasoning" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: /search_docs/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("names tool payloads per tool, so two open tools do not collide", async () => {
    const user = userEvent.setup();
    render(<AiChatBlock messages={MESSAGES} />);

    await user.click(screen.getByRole("button", { name: /search_docs/ }));
    expect(
      await screen.findByRole("region", { name: "search_docs arguments" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "search_docs result" })).toBeInTheDocument();
  });

  it("lists sources behind a disclosure", async () => {
    const user = userEvent.setup();
    render(<AiChatBlock messages={MESSAGES} />);

    await user.click(screen.getByRole("button", { name: "1 source" }));
    expect(await screen.findByText("ARIA Authoring Practices")).toBeInTheDocument();
  });

  it("shows the token count for a finished response", () => {
    render(<AiChatBlock messages={MESSAGES} />);
    expect(screen.getByText("148 tokens")).toBeInTheDocument();
  });

  it("sends a message and clears the composer", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<AiChatBlock messages={MESSAGES} onSend={onSend} />);

    const composer = screen.getByRole("textbox", { name: "Message" });
    await user.type(composer, "Thanks{Enter}");

    expect(onSend).toHaveBeenCalledWith("Thanks");
    await waitFor(() => {
      expect(composer).toHaveValue("");
    });
  });

  it("does not send an empty message", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<AiChatBlock messages={MESSAGES} onSend={onSend} />);

    await user.type(screen.getByRole("textbox", { name: "Message" }), "   {Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("offers Stop while a response is in flight", async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    render(<AiChatBlock messages={MESSAGES} busy onStop={onStop} />);

    await user.click(screen.getByRole("button", { name: "Stop generating" }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("offers a model picker when models are given", async () => {
    const onModelChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AiChatBlock
        messages={MESSAGES}
        model="fast"
        onModelChange={onModelChange}
        models={[
          { id: "fast", name: "Fast" },
          { id: "deep", name: "Deep" },
        ]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Model" }));
    await user.click(await screen.findByRole("option", { name: "Deep" }));
    expect(onModelChange).toHaveBeenCalledWith("deep");
  });

  it("hides the model picker when there are no models", () => {
    render(<AiChatBlock messages={MESSAGES} />);
    expect(screen.queryByRole("combobox", { name: "Model" })).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<AiChatBlock messages={MESSAGES} />);
    await expectNoA11yViolations(container);
  });
});
