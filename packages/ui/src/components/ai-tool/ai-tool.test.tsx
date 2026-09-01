import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolPayload,
  ToolSection,
  type ToolStatus,
} from "./ai-tool";

function Example({ status = "success" }: { status?: ToolStatus } = {}) {
  return (
    <Tool status={status}>
      <ToolHeader name="search_web" status={status} />
      <ToolContent>
        <ToolSection label="Arguments">
          <ToolPayload label="Arguments">{'{ "query": "capital of France" }'}</ToolPayload>
        </ToolSection>
        <ToolSection label="Result">
          <ToolPayload label="Result">{'{ "answer": "Paris" }'}</ToolPayload>
        </ToolSection>
      </ToolContent>
    </Tool>
  );
}

describe("Tool", () => {
  it("is collapsed by default, because provenance is not the answer", () => {
    render(<Example />);
    expect(screen.getByRole("button", { name: /search_web/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByText(/capital of France/)).not.toBeInTheDocument();
  });

  it("opens on click", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: /search_web/ }));
    expect(await screen.findByText(/capital of France/)).toBeInTheDocument();
  });

  it("opens from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.tab();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /search_web/ })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });
  });

  it.each([
    ["pending", "Queued"],
    ["running", "Running"],
    ["success", "Completed"],
    ["error", "Failed"],
  ] as const)("states the %s status in words, not only in colour", (status, label) => {
    render(<Example status={status} />);
    // A coloured dot says nothing to a screen reader, and nothing to anyone who
    // cannot distinguish the colours.
    expect(screen.getByRole("button", { name: new RegExp(label) })).toBeInTheDocument();
  });

  it("accepts custom status wording", () => {
    render(
      <Tool status="running">
        <ToolHeader name="fetch" status="running" statusLabel="Fetching page 2 of 5" />
        <ToolContent>Body</ToolContent>
      </Tool>,
    );
    expect(screen.getByText("Fetching page 2 of 5")).toBeInTheDocument();
  });

  it("marks the status for styling", () => {
    const { container } = render(<Example status="error" />);
    expect(container.querySelector("[data-slot='tool']")).toHaveAttribute(
      "data-status",
      "error",
    );
  });

  it("makes payloads focusable named regions", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: /search_web/ }));

    // JSON scrolls, and a scroll box that cannot take focus is unreachable by
    // keyboard.
    const payload = await screen.findByRole("region", { name: "Arguments" });
    expect(payload).toHaveAttribute("tabindex", "0");
  });

  it("labels each section", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: /search_web/ }));
    expect(await screen.findByText("Arguments")).toBeInTheDocument();
    expect(screen.getByText("Result")).toBeInTheDocument();
  });

  it("can be opened by default", () => {
    render(
      <Tool status="success" defaultOpen>
        <ToolHeader name="read_file" status="success" />
        <ToolContent>Contents</ToolContent>
      </Tool>,
    );
    expect(screen.getByText("Contents")).toBeInTheDocument();
  });

  it("has no accessibility violations when open", async () => {
    const { container } = render(
      <Tool status="success" defaultOpen>
        <ToolHeader name="search_web" status="success" />
        <ToolContent>
          <ToolSection label="Result">
            <ToolPayload label="Result">{'{ "answer": "Paris" }'}</ToolPayload>
          </ToolSection>
        </ToolContent>
      </Tool>,
    );
    await expectNoA11yViolations(container);
  });
});
