import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Button } from "../button";
import {
  Message,
  MessageActions,
  MessageAvatar,
  MessageBody,
  MessageFooter,
} from "./ai-message";

describe("Message", () => {
  it("renders as a list item, for a transcript", () => {
    render(
      <ol>
        <Message from="user">
          <MessageBody from="user">Hello</MessageBody>
        </Message>
      </ol>,
    );
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it.each([
    ["user", "You said"],
    ["assistant", "Assistant said"],
    ["system", "System"],
  ] as const)("names the %s speaker in text, not only by layout", (role, label) => {
    render(
      <ol>
        <Message from={role}>
          <MessageBody from={role}>Content</MessageBody>
        </Message>
      </ol>,
    );
    // Colour and alignment convey the speaker to a sighted reader and nothing
    // to anyone else, so the role has to be readable.
    expect(screen.getByRole("listitem")).toHaveTextContent(label);
  });

  it("accepts a custom speaker label", () => {
    render(
      <ol>
        <Message from="assistant" fromLabel="Claude said">
          <MessageBody from="assistant">Hi</MessageBody>
        </Message>
      </ol>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Claude said");
  });

  it("marks the speaker for styling", () => {
    render(
      <ol>
        <Message from="user">
          <MessageBody from="user">Hello</MessageBody>
        </Message>
      </ol>,
    );
    expect(screen.getByRole("listitem")).toHaveAttribute("data-from", "user");
  });

  it("does not shadow the ARIA role attribute", () => {
    // `from` names the speaker; `role` still reaches the element as the real
    // ARIA attribute, so a consumer can override the list-item semantics.
    render(
      <ol>
        <Message from="assistant" role="presentation">
          <MessageBody from="assistant">Hi</MessageBody>
        </Message>
      </ol>,
    );
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("hides the avatar from assistive technology", () => {
    const { container } = render(
      <ol>
        <Message from="assistant">
          <MessageAvatar>AI</MessageAvatar>
          <MessageBody from="assistant">Hi</MessageBody>
        </Message>
      </ol>,
    );
    expect(container.querySelector("[data-slot='message-avatar']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("keeps hover-revealed actions in the tab order", async () => {
    const user = userEvent.setup();
    render(
      <ol>
        <Message from="assistant">
          <MessageBody from="assistant">
            Hi
            <MessageActions>
              <Button size="icon-sm" variant="ghost" aria-label="Copy">
                C
              </Button>
            </MessageActions>
          </MessageBody>
        </Message>
      </ol>,
    );

    // Visually faded until hover, but reachable — a control that only exists on
    // hover is unusable by keyboard and invisible on touch.
    await user.tab();
    expect(screen.getByRole("button", { name: "Copy" })).toHaveFocus();
  });

  it("renders a footer for attachments and citations", () => {
    render(
      <ol>
        <Message from="assistant">
          <MessageBody from="assistant">
            Hi
            <MessageFooter>
              <span>2 sources</span>
            </MessageFooter>
          </MessageBody>
        </Message>
      </ol>,
    );
    expect(screen.getByText("2 sources")).toBeInTheDocument();
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(
      <ol>
        <Message from="user" className="gap-8">
          <MessageBody from="user">Hi</MessageBody>
        </Message>
      </ol>,
    );
    const item = screen.getByRole("listitem");
    expect(item).toHaveClass("gap-8");
    expect(item).not.toHaveClass("gap-3");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <ol>
        <Message from="user">
          <MessageBody from="user">What is the capital of France?</MessageBody>
        </Message>
        <Message from="assistant">
          <MessageAvatar>AI</MessageAvatar>
          <MessageBody from="assistant">Paris.</MessageBody>
        </Message>
      </ol>,
    );
    await expectNoA11yViolations(container);
  });
});
