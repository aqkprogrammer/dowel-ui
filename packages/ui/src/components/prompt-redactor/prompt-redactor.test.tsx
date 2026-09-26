import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PromptRedactor, usePromptRedactor } from "./prompt-redactor";

/** Assembled at runtime so no literal looks like a credential to a secret scanner. */
const FAKE_KEY = ["sk", "live", "abcdefghijklmnop1234"].join("_");

/** A composer: type, see the check, send, get a reply back restored. */
function Composer({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  const [sent, setSent] = useState<string[]>([]);
  const [reply, setReply] = useState("");
  const redactor = usePromptRedactor(value);
  return (
    <>
      <label>
        Message
        <textarea
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
        />
      </label>
      <PromptRedactor redactor={redactor} />
      <button
        type="button"
        onClick={() => {
          const outgoing = redactor.redact();
          setSent((current) => [...current, outgoing]);
          // A model that repeats the placeholders back.
          setReply(redactor.restore(`Noted: ${outgoing}`));
          setValue("");
        }}
      >
        Send
      </button>
      <div data-testid="sent">{sent.join(" | ")}</div>
      <div data-testid="reply">{reply}</div>
    </>
  );
}

describe("PromptRedactor", () => {
  it("is empty and unnamed until something is found, but its status region exists", () => {
    const { container } = render(<Composer />);
    const status = container.querySelector("[data-slot='prompt-redactor-status']");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toBeEmptyDOMElement();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("names what it finds, masked, with the placeholder it will be sent as", async () => {
    const user = userEvent.setup();
    render(<Composer />);
    await user.type(
      screen.getByLabelText("Message"),
      "Refund 4242 4242 4242 4242 for dana@acme.test",
    );
    const panel = screen.getByRole("region", { name: "Before you send" });
    expect(panel).toHaveTextContent("2 things will be replaced before sending.");
    expect(panel).toHaveTextContent("Card numbercard ending 4242sent as [CARD_1]");
    expect(panel).toHaveTextContent("Email addressd•••@acme.testsent as [EMAIL_1]");
    expect(panel).not.toHaveTextContent("4242 4242 4242 4242");
  });

  it("sends placeholders, and restores them in the reply", async () => {
    const user = userEvent.setup();
    render(<Composer initial="Refund dana@acme.test" />);
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByTestId("sent")).toHaveTextContent("Refund [EMAIL_1]");
    expect(screen.getByTestId("reply")).toHaveTextContent("Noted: Refund dana@acme.test");
  });

  it("keeps a value's placeholder across messages", async () => {
    const user = userEvent.setup();
    render(<Composer initial="Refund dana@acme.test" />);
    await user.click(screen.getByRole("button", { name: "Send" }));
    await user.type(screen.getByLabelText("Message"), "Also sam@acme.test and dana@acme.test");
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByTestId("sent")).toHaveTextContent(
      "Refund [EMAIL_1] | Also [EMAIL_2] and [EMAIL_1]",
    );
  });

  it("sends a value as typed when asked, and warns when it is a secret", async () => {
    const user = userEvent.setup();
    render(<Composer initial={`Key ${FAKE_KEY} for dana@acme.test`} />);
    const keep = screen.getByRole("button", { name: /Send as typed: API key/ });
    await user.click(keep);
    expect(keep).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/A model never needs a secret/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 thing will be replaced before sending.",
    );

    await user.click(screen.getByRole("button", { name: /Send as typed: Email address/ }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nothing will be replaced: 2 things will be sent as typed.",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByTestId("sent")).toHaveTextContent(`Key ${FAKE_KEY} for dana@acme.test`);
  });

  it("lists a repeated value once, and says how often it appears", () => {
    render(<Composer initial="dana@acme.test, dana@acme.test" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("(appears 2 times)")).toBeInTheDocument();
  });

  it("shows exactly what will be sent", async () => {
    const user = userEvent.setup();
    render(<Composer initial="Ping dana@acme.test" />);
    await user.click(screen.getByText("What will be sent"));
    expect(screen.getByText("Ping [EMAIL_1]")).toBeVisible();
  });

  it("never counts as taking over an agent surface", () => {
    render(<Composer initial="dana@acme.test" />);
    expect(screen.getByRole("region")).toHaveAttribute("data-agent-ui");
  });

  it("lets className through, and forwards ref", () => {
    const ref = createRef<HTMLElement>();
    function WithRef() {
      const redactor = usePromptRedactor("dana@acme.test");
      return <PromptRedactor ref={ref} redactor={redactor} className="mt-4" />;
    }
    render(<WithRef />);
    expect(ref.current).toHaveClass("mt-4");
    expect(ref.current?.dataset.slot).toBe("prompt-redactor");
  });

  it("has no detectable accessibility violations when empty", async () => {
    const { container } = render(<Composer />);
    await expectNoA11yViolations(container);
  });

  it("has no detectable accessibility violations with findings", async () => {
    const { container } = render(<Composer initial={`${FAKE_KEY} and dana@acme.test`} />);
    await expectNoA11yViolations(container);
  });
});
