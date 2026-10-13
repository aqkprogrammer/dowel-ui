import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { IntegrationsBlock, type Integration } from "./integrations";

const items: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    category: "Chat",
    description: "Messages.",
    connected: true,
    href: "/settings/slack",
  },
  { id: "github", name: "GitHub", category: "Code", description: "Issues and pull requests." },
  { id: "linear", name: "Linear", category: "Code", description: "Tasks." },
];

describe("IntegrationsBlock", () => {
  it("names each switch by its service and says its state in words", async () => {
    const { container } = render(<IntegrationsBlock integrations={items} />);
    expect(screen.getByRole("switch", { name: "Slack" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "GitHub" })).not.toBeChecked();
    const slack = screen.getByRole("switch", { name: "Slack" }).closest("li") as HTMLElement;
    expect(within(slack).getByText("Connected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings for Slack" })).toHaveAttribute(
      "href",
      "/settings/slack",
    );
    expect(screen.getByRole("status")).toHaveTextContent("3 shown · 1 connected");
    await expectNoA11yViolations(container);
  });

  it("connects, tells onConnectedChange, and counts it", async () => {
    const onConnectedChange = vi.fn();
    render(<IntegrationsBlock integrations={items} onConnectedChange={onConnectedChange} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "GitHub" }));
      await Promise.resolve();
    });
    expect(onConnectedChange).toHaveBeenCalledWith("github", true);
    expect(screen.getByRole("switch", { name: "GitHub" })).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("2 connected");
  });

  it("puts the switch back when onConnectedChange rejects", async () => {
    const onConnectedChange = vi.fn(() => Promise.reject(new Error("no")));
    render(<IntegrationsBlock integrations={items} onConnectedChange={onConnectedChange} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Linear" }));
      await Promise.resolve();
    });
    expect(screen.getByRole("switch", { name: "Linear" })).not.toBeChecked();
  });

  it("filters by category, by connected, and by search", () => {
    render(<IntegrationsBlock integrations={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Code" }));
    expect(screen.queryByRole("switch", { name: "Slack" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Connected" }));
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search integrations" }), {
      target: { value: "pull" },
    });
    expect(screen.getByRole("switch", { name: "GitHub" })).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText(/No integrations match/)).toBeInTheDocument();
  });
});
