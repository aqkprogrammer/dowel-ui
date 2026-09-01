import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Message, MessageBody } from "../ai-message";
import {
  Conversation,
  ConversationMessages,
  ConversationScrollButton,
  ConversationStatus,
} from "./ai-conversation";

function Example({ status }: { status?: string } = {}) {
  return (
    <Conversation>
      <ConversationMessages>
        <Message from="user">
          <MessageBody from="user">What is the capital of France?</MessageBody>
        </Message>
        <Message from="assistant">
          <MessageBody from="assistant">Paris.</MessageBody>
        </Message>
      </ConversationMessages>
      {status ? <ConversationStatus>{status}</ConversationStatus> : null}
      <ConversationScrollButton />
    </Conversation>
  );
}

/** jsdom has no layout, so scroll geometry is stubbed to drive the logic. */
function stubScroll(
  viewport: HTMLElement,
  { scrollTop = 0, scrollHeight = 1000, clientHeight = 400 } = {},
) {
  Object.defineProperty(viewport, "scrollHeight", { value: scrollHeight, configurable: true });
  Object.defineProperty(viewport, "clientHeight", { value: clientHeight, configurable: true });
  Object.defineProperty(viewport, "scrollTop", {
    value: scrollTop,
    writable: true,
    configurable: true,
  });
}

function viewportOf(container: HTMLElement): HTMLElement {
  const viewport = container.querySelector<HTMLElement>("[data-slot='conversation-viewport']");
  if (!viewport) throw new Error("no viewport");
  return viewport;
}

describe("Conversation", () => {
  it("renders the transcript as an ordered list", () => {
    render(<Example />);
    expect(screen.getByRole("list").tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("does NOT make the transcript a live region", () => {
    // The central accessibility decision of this component. A live region that
    // updates per streamed token is unusable with a screen reader.
    const list = render(<Example />).container.querySelector(
      "[data-slot='conversation-messages']",
    );
    expect(list).not.toHaveAttribute("aria-live");
    expect(list).not.toHaveAttribute("role", "log");
  });

  it("announces state, not content, through a separate status region", () => {
    render(<Example status="Generating response" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Generating response");
    // The transcript text must not be inside the live region.
    expect(status).not.toHaveTextContent("Paris.");
  });

  describe("the jump-to-latest control", () => {
    it("is absent while the reader is at the bottom", () => {
      render(<Example />);
      expect(screen.queryByRole("button", { name: "Jump to latest" })).not.toBeInTheDocument();
    });

    it("appears once the reader scrolls away", async () => {
      const { container } = render(<Example />);
      const viewport = viewportOf(container);

      stubScroll(viewport, { scrollTop: 0 });
      fireEvent.scroll(viewport);

      expect(await screen.findByRole("button", { name: "Jump to latest" })).toBeInTheDocument();
    });

    it("scrolls back down and then disappears", async () => {
      const user = userEvent.setup();
      const { container } = render(<Example />);
      const viewport = viewportOf(container);
      const scrollTo = vi.fn();
      viewport.scrollTo = scrollTo;

      stubScroll(viewport, { scrollTop: 0 });
      fireEvent.scroll(viewport);
      await user.click(await screen.findByRole("button", { name: "Jump to latest" }));

      expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: "smooth" });

      stubScroll(viewport, { scrollTop: 600 });
      fireEvent.scroll(viewport);
      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: "Jump to latest" }),
        ).not.toBeInTheDocument();
      });
    });

    it("counts near-the-bottom as the bottom, so a pixel of drift is not a prompt", async () => {
      const { container } = render(<Example />);
      const viewport = viewportOf(container);

      stubScroll(viewport, { scrollTop: 580 });
      fireEvent.scroll(viewport);

      await waitFor(() => {
        expect(container.querySelector("[data-slot='conversation']")).toHaveAttribute(
          "data-at-bottom",
          "true",
        );
      });
    });
  });

  it("throws a useful error if the scroll button is used outside the root", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<ConversationScrollButton />)).toThrow(
      /must be rendered inside <Conversation>/,
    );
    consoleError.mockRestore();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Example status="Response complete" />);
    await expectNoA11yViolations(container);
  });
});
