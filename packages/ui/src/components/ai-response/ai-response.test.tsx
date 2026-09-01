import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Response, ThinkingIndicator } from "./ai-response";

describe("Response", () => {
  it("renders its text", () => {
    render(<Response>The capital of France is Paris.</Response>);
    expect(screen.getByText("The capital of France is Paris.")).toBeInTheDocument();
  });

  it("is NOT a live region", () => {
    // Announcing streamed text as it arrives interrupts a screen reader on
    // every token; state goes through ConversationStatus instead.
    const { container } = render(<Response streaming>Partial…</Response>);
    const response = container.querySelector("[data-slot='response']");

    expect(response).not.toHaveAttribute("aria-live");
    expect(response).not.toHaveAttribute("role");
  });

  it("shows a decorative caret while streaming", () => {
    const { container } = render(<Response streaming>Partial</Response>);
    const caret = container.querySelector("[data-slot='response-caret']");

    expect(caret).toBeInTheDocument();
    expect(caret).toHaveAttribute("aria-hidden", "true");
  });

  it("has no caret when it is not streaming", () => {
    const { container } = render(<Response>Done</Response>);
    expect(container.querySelector("[data-slot='response-caret']")).not.toBeInTheDocument();
  });

  it("marks the streaming state for styling", () => {
    const { container } = render(<Response streaming>Partial</Response>);
    expect(container.querySelector("[data-slot='response']")).toHaveAttribute(
      "data-streaming",
      "true",
    );
  });

  it("preserves paragraph whitespace", () => {
    const { container } = render(<Response>{"line one\nline two"}</Response>);
    expect(container.querySelector("[data-slot='response']")).toHaveClass(
      "whitespace-pre-wrap",
    );
  });

  it("renders markup a consumer has already rendered", () => {
    render(
      <Response>
        <p>First</p>
        <p>Second</p>
      </Response>,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("lets a consumer className override a conflicting utility", () => {
    const { container } = render(<Response className="text-base">Hi</Response>);
    const response = container.querySelector("[data-slot='response']");
    expect(response).toHaveClass("text-base");
    expect(response).not.toHaveClass("text-sm");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Response streaming>Streaming text…</Response>);
    await expectNoA11yViolations(container);
  });
});

describe("ThinkingIndicator", () => {
  it("is labelled, because it is the only thing on screen", () => {
    render(<ThinkingIndicator />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<ThinkingIndicator label="Searching the web" />);
    expect(screen.getByText("Searching the web")).toBeInTheDocument();
  });

  it("hides its dots from assistive technology", () => {
    const { container } = render(<ThinkingIndicator />);
    const dots = container.querySelectorAll("span[aria-hidden='true']");
    expect(dots).toHaveLength(3);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<ThinkingIndicator />);
    await expectNoA11yViolations(container);
  });
});
