import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { MessageThread, type ThreadMessage } from "./message-thread";

const THREAD: ThreadMessage[] = [
  { id: "1", from: "them", text: "No rush" },
  { id: "2", from: "me", text: "Running 5 min late" },
];

describe("MessageThread", () => {
  it("renders a named log with sender-labelled bubbles", () => {
    render(<MessageThread defaultMessages={THREAD} contactName="Sam" />);
    const log = screen.getByRole("log", { name: "Messages" });
    expect(within(log).getByText("No rush").closest("p")).toHaveTextContent("Sam: No rush");
    expect(within(log).getByText("Running 5 min late").closest("p")).toHaveTextContent(
      "You: Running 5 min late",
    );
  });

  it("sends on Enter, appends when uncontrolled and clears the field", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageThread defaultMessages={THREAD} onSend={onSend} />);
    const field = screen.getByRole("textbox", { name: "Message" });
    await user.type(field, "On my way!{Enter}");
    expect(onSend).toHaveBeenCalledWith("On my way!");
    expect(field).toHaveValue("");
    const bubble = within(screen.getByRole("log")).getByText("On my way!");
    expect(bubble.closest("[data-part=row]")).toHaveAttribute("data-new");
    // Messages from the first render do not animate.
    expect(screen.getByText("No rush").closest("[data-part=row]")).not.toHaveAttribute(
      "data-new",
    );
  });

  it("disables send while the field is empty, and sends by click", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageThread onSend={onSend} />);
    const send = screen.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "  Hi  ");
    await user.click(send);
    expect(onSend).toHaveBeenCalledWith("Hi");
  });

  it("leaves a controlled thread to its owner", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [messages, setMessages] = useState(THREAD);
      return (
        <MessageThread
          messages={messages}
          onSend={(text) =>
            setMessages([...messages, { id: "x", from: "me", text: text.toUpperCase() }])
          }
        />
      );
    }
    render(<Controlled />);
    await user.type(screen.getByRole("textbox"), "ok{Enter}");
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.queryByText("ok")).not.toBeInTheDocument();
  });

  it("follows a controlled draft", () => {
    render(<MessageThread value="On my way" onValueChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("On my way");
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("says when the other person is typing", () => {
    render(<MessageThread typing contactName="Sam" />);
    expect(within(screen.getByRole("log")).getByText("Sam is typing")).toBeInTheDocument();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<MessageThread ref={ref} className="custom" />);
    expect(ref.current).toBe(container.querySelector("[data-slot=message-thread]"));
    expect(ref.current).toHaveClass("custom", "rounded-2xl");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<MessageThread defaultMessages={THREAD} typing />);
    await expectNoA11yViolations(container);
  });
});
