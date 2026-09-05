import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  CommandCenterBlock,
  describeFleet,
  type CommandCenterAction,
  type CommandCenterCapacity,
  type CommandCenterIncident,
  type CommandCenterService,
} from "./command-center";

const SERVICES: CommandCenterService[] = [
  { id: "api", name: "API", health: "operational", uptime: "99.99%", latencyMs: 120 },
  { id: "web", name: "Web app", health: "degraded", latencyMs: 840, region: "eu-west-1" },
  { id: "db", name: "Primary database", health: "outage", href: "/services/db" },
  { id: "jobs", name: "Job runner", health: "maintenance" },
];

const INCIDENTS: CommandCenterIncident[] = [
  {
    id: "i1",
    title: "Elevated error rate on checkout",
    severity: "minor",
    status: "monitoring",
    startedAt: "2026-03-04T08:00:00Z",
    startedLabel: "an hour ago",
  },
  {
    id: "i2",
    title: "Primary database unreachable",
    severity: "critical",
    status: "investigating",
    detail: "Failover has not completed.",
    startedAt: "2026-03-04T09:02:00Z",
    startedLabel: "12 minutes ago",
    href: "/incidents/i2",
  },
  {
    id: "i3",
    title: "Slow image uploads",
    severity: "major",
    status: "resolved",
    startedAt: "2026-03-03T14:00:00Z",
    startedLabel: "yesterday",
  },
];

const CAPACITY: CommandCenterCapacity[] = [
  { id: "cpu", label: "Compute", used: 62, max: 100, format: (value) => `${String(value)}%` },
  {
    id: "storage",
    label: "Storage",
    used: 1_800,
    max: 2_000,
    warnAt: 0.85,
    format: (value) => `${String(value)} GB`,
  },
];

function actions(onSelect = vi.fn()): CommandCenterAction[] {
  return [
    { id: "restart", label: "Restart API", shortcut: "⌘R", group: "Services", onSelect },
    { id: "page", label: "Page on-call", keywords: ["alert", "wake"], onSelect: vi.fn() },
  ];
}

describe("describeFleet", () => {
  it("says who is down, by name, when it is one service", () => {
    expect(describeFleet(SERVICES)).toEqual({
      sentence: "Primary database is down, and Web app degraded.",
      worst: "outage",
    });
  });

  it("counts rather than lists when several are down", () => {
    const down = SERVICES.map((service) => ({ ...service, health: "outage" as const }));
    expect(describeFleet(down).sentence).toBe("4 services are down.");
  });

  it("reports maintenance as operational with a note", () => {
    const fleet = describeFleet([
      { id: "a", name: "A", health: "operational" },
      { id: "b", name: "B", health: "maintenance" },
    ]);
    expect(fleet.sentence).toBe("All systems operational. B is in maintenance.");
    expect(fleet.worst).toBe("maintenance");
  });

  it("says when nothing is watched", () => {
    expect(describeFleet([]).sentence).toBe("No services are being watched.");
  });
});

describe("CommandCenterBlock", () => {
  it("leads with the fleet sentence rather than a grid of colours", () => {
    render(<CommandCenterBlock services={SERVICES} incidents={INCIDENTS} />);

    const status = screen.getByText("Primary database is down, and Web app degraded.");
    expect(status).toBeInTheDocument();
    expect(screen.getByText(/4 services watched, 2 open incidents/)).toBeInTheDocument();
  });

  it("does not make the status a live region", () => {
    const { container } = render(<CommandCenterBlock services={SERVICES} />);
    // Refreshed by polling; announcing every refresh makes the page unusable.
    expect(container.querySelectorAll("[aria-live]:not([aria-live='off'])")).toHaveLength(0);
  });

  it("orders services worst first, with health as a word", () => {
    render(<CommandCenterBlock services={SERVICES} />);

    const list = screen
      .getByRole("heading", { name: "Services" })
      .closest("[data-slot='card']");
    const items = within(list as HTMLElement).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Primary database");
    expect(items[0]).toHaveTextContent("Outage");
    expect(items[1]).toHaveTextContent("Web app");
    expect(items[1]).toHaveTextContent("Degraded");
    expect(items[3]).toHaveTextContent("Operational");
  });

  it("links a service to its own page when there is one", () => {
    render(<CommandCenterBlock services={SERVICES} />);
    expect(screen.getByRole("link", { name: "Primary database" })).toHaveAttribute(
      "href",
      "/services/db",
    );
  });

  it("puts open incidents first, most severe at the top, then the resolved ones", () => {
    render(<CommandCenterBlock services={SERVICES} incidents={INCIDENTS} />);

    const card = screen
      .getByRole("heading", { name: "Incidents" })
      .closest("[data-slot='card']");
    const items = within(card as HTMLElement).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Primary database unreachable");
    expect(items[0]).toHaveTextContent("critical");
    expect(items[1]).toHaveTextContent("Elevated error rate on checkout");
    expect(items[2]).toHaveTextContent("Slow image uploads");
    expect(items[2]).toHaveAttribute("data-resolved");
  });

  it("explains an empty incident list", () => {
    render(<CommandCenterBlock services={SERVICES} />);
    expect(screen.getByText("No incidents")).toBeInTheDocument();
  });

  it("states capacity as a value of a maximum, not as a bar", () => {
    render(<CommandCenterBlock services={SERVICES} capacity={CAPACITY} />);

    expect(screen.getByRole("meter", { name: "Storage" })).toHaveAttribute(
      "aria-valuetext",
      "1800 GB of 2000 GB",
    );
  });

  it("offers the palette only when there are actions", () => {
    const { rerender } = render(<CommandCenterBlock services={SERVICES} />);
    expect(screen.queryByRole("button", { name: /Actions/ })).not.toBeInTheDocument();

    rerender(<CommandCenterBlock services={SERVICES} actions={actions()} />);
    expect(screen.getByRole("button", { name: /Actions/ })).toBeInTheDocument();
  });

  it("runs an action chosen from the palette and closes it", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<CommandCenterBlock services={SERVICES} actions={actions(onSelect)} />);

    await user.click(screen.getByRole("button", { name: /Actions/ }));
    const dialog = screen.getByRole("dialog", { name: "Actions" });
    await user.type(within(dialog).getByRole("combobox"), "restart");
    // Typing narrows the list; nothing is active until it is reached.
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("finds an action by a keyword that is not shown", async () => {
    const user = userEvent.setup();
    render(<CommandCenterBlock services={SERVICES} actions={actions()} />);

    await user.click(screen.getByRole("button", { name: /Actions/ }));
    await user.type(screen.getByRole("combobox"), "wake");

    expect(screen.getByRole("option", { name: /Page on-call/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Restart API/ })).not.toBeInTheDocument();
  });

  it("opens the palette from the keyboard as well as the button", () => {
    render(<CommandCenterBlock services={SERVICES} actions={actions()} />);

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog", { name: "Actions" })).toBeInTheDocument();
  });

  it("ignores the shortcut when there is nothing to open", () => {
    render(<CommandCenterBlock services={SERVICES} />);

    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the logs in a named region that does not announce itself", () => {
    const { container } = render(
      <CommandCenterBlock
        services={SERVICES}
        logs={[
          { id: "l1", level: "info", message: "Server listening", timestamp: "10:00:00" },
          { id: "l2", level: "error", message: "Connection refused", timestamp: "10:00:01" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Recent logs" })).toBeInTheDocument();
    expect(
      container.querySelectorAll("[aria-live='polite'], [aria-live='assertive']"),
    ).toHaveLength(0);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <CommandCenterBlock
        services={SERVICES}
        incidents={INCIDENTS}
        capacity={CAPACITY}
        actions={actions()}
        updatedAt="2026-03-04T09:14:00Z"
        updatedLabel="10 seconds ago"
        logs={[{ id: "l1", level: "info", message: "Server listening", timestamp: "10:00:00" }]}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
