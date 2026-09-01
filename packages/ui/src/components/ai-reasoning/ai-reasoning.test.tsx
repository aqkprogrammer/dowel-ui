import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./ai-reasoning";

describe("Reasoning", () => {
  it("is collapsed by default, so the answer is not buried", () => {
    render(
      <Reasoning>
        <ReasoningTrigger />
        <ReasoningContent>Step one, then step two.</ReasoningContent>
      </Reasoning>,
    );

    expect(screen.getByRole("button", { name: "Reasoning" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText("Step one, then step two.")).not.toBeInTheDocument();
  });

  it("opens on click", async () => {
    const user = userEvent.setup();
    render(
      <Reasoning>
        <ReasoningTrigger />
        <ReasoningContent>Step one, then step two.</ReasoningContent>
      </Reasoning>,
    );

    await user.click(screen.getByRole("button", { name: "Reasoning" }));
    expect(await screen.findByText("Step one, then step two.")).toBeInTheDocument();
  });

  it("says it is thinking while reasoning streams", () => {
    render(
      <Reasoning>
        <ReasoningTrigger streaming />
        <ReasoningContent>Partial…</ReasoningContent>
      </Reasoning>,
    );
    expect(screen.getByRole("button", { name: "Thinking…" })).toBeInTheDocument();
  });

  it("accepts custom labels", () => {
    render(
      <Reasoning>
        <ReasoningTrigger label="Show working" />
        <ReasoningContent>Work</ReasoningContent>
      </Reasoning>,
    );
    expect(screen.getByRole("button", { name: "Show working" })).toBeInTheDocument();
  });

  it("can be opened by default", () => {
    render(
      <Reasoning defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>Visible</ReasoningContent>
      </Reasoning>,
    );
    expect(screen.getByText("Visible")).toBeInTheDocument();
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(
      <Reasoning>
        <ReasoningTrigger />
        <ReasoningContent>Work</ReasoningContent>
      </Reasoning>,
    );

    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reasoning" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Reasoning defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent>Step one, then step two.</ReasoningContent>
      </Reasoning>,
    );
    await expectNoA11yViolations(container);
  });
});
