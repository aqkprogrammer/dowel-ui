import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import type { LogLevel, LogLine } from "@/components/log-viewer";

import {
  CommandCenterBlock,
  type CommandCenterAction,
  type CommandCenterCapacity,
  type CommandCenterIncident,
  type CommandCenterService,
} from "./command-center";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[72rem] max-w-full">
    <Story />
  </div>
);

const SERVICES: CommandCenterService[] = [
  {
    id: "api",
    name: "API",
    health: "operational",
    uptime: "99.99%",
    latencyMs: 118,
    region: "us-east-1",
  },
  {
    id: "web",
    name: "Web app",
    health: "operational",
    uptime: "99.98%",
    latencyMs: 210,
    region: "global",
  },
  {
    id: "db",
    name: "Primary database",
    health: "outage",
    uptime: "99.91%",
    region: "us-east-1",
    href: "#db",
  },
  {
    id: "replica",
    name: "Read replica",
    health: "degraded",
    uptime: "99.95%",
    latencyMs: 640,
    region: "eu-west-1",
  },
  {
    id: "jobs",
    name: "Job runner",
    health: "maintenance",
    uptime: "99.97%",
    region: "us-east-1",
  },
  {
    id: "search",
    name: "Search",
    health: "operational",
    uptime: "100%",
    latencyMs: 42,
    region: "global",
  },
  {
    id: "mail",
    name: "Email delivery",
    health: "operational",
    uptime: "99.99%",
    region: "global",
  },
  {
    id: "cdn",
    name: "CDN",
    health: "operational",
    uptime: "100%",
    latencyMs: 18,
    region: "global",
  },
];

const INCIDENTS: CommandCenterIncident[] = [
  {
    id: "i2",
    title: "Primary database unreachable",
    severity: "critical",
    status: "investigating",
    detail:
      "Automatic failover has not completed. Writes are failing; reads are served from the replica.",
    startedAt: "2026-03-04T09:02:00Z",
    startedLabel: "12 minutes ago",
    href: "#i2",
  },
  {
    id: "i1",
    title: "Elevated latency on read replica",
    severity: "major",
    status: "identified",
    detail: "Replication lag from the failover in progress.",
    startedAt: "2026-03-04T09:05:00Z",
    startedLabel: "9 minutes ago",
    href: "#i1",
  },
  {
    id: "i0",
    title: "Checkout error rate above 1%",
    severity: "minor",
    status: "monitoring",
    startedAt: "2026-03-04T08:10:00Z",
    startedLabel: "an hour ago",
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
    id: "mem",
    label: "Memory",
    used: 81,
    max: 100,
    warnAt: 0.8,
    format: (value) => `${String(value)}%`,
  },
  {
    id: "storage",
    label: "Storage",
    used: 1_780,
    max: 2_000,
    warnAt: 0.85,
    format: (value) => `${String(value)} GB`,
  },
  { id: "conn", label: "Database connections", used: 412, max: 500, warnAt: 0.9 },
];

const MESSAGES: { level: LogLevel; message: string; fields?: Record<string, unknown> }[] = [
  { level: "info", message: "GET /api/orders 200 in 34ms" },
  {
    level: "warn",
    message: "Replication lag 4.2s",
    fields: { replica: "eu-west-1", lagMs: 4200 },
  },
  {
    level: "error",
    message: "Write failed: connection refused",
    fields: { host: "db-primary", code: "ECONNREFUSED" },
  },
  { level: "info", message: "Failover step 3/5: promoting replica" },
  { level: "debug", message: "Pool size 32, idle 4" },
  { level: "info", message: "POST /api/checkout 503 in 1201ms" },
  {
    level: "error",
    message: "Checkout: payment intent not persisted",
    fields: { orderId: "o_9f2c" },
  },
  { level: "info", message: "Health check passed for search" },
];

function makeLogs(count: number): LogLine[] {
  return Array.from({ length: count }, (_, index) => {
    const source = MESSAGES[index % MESSAGES.length];
    return {
      id: `line-${String(index)}`,
      level: source?.level,
      message: source?.message ?? "",
      fields: source?.fields,
      timestamp: `09:${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`,
    };
  });
}

const ACTIONS: CommandCenterAction[] = [
  {
    id: "failover",
    label: "Force database failover",
    description: "Promote the replica now.",
    shortcut: "⌘F",
    group: "Database",
    keywords: ["promote", "replica"],
    onSelect: () => undefined,
  },
  {
    id: "restart-api",
    label: "Restart API",
    shortcut: "⌘R",
    group: "Services",
    onSelect: () => undefined,
  },
  {
    id: "drain",
    label: "Drain job runner",
    description: "Finish running jobs, accept no new ones.",
    group: "Services",
    onSelect: () => undefined,
  },
  {
    id: "page",
    label: "Page on-call",
    description: "Wake whoever is on the rota.",
    group: "People",
    keywords: ["alert", "wake", "pager"],
    onSelect: () => undefined,
  },
  {
    id: "status",
    label: "Post status update",
    group: "People",
    keywords: ["statuspage", "customers"],
    onSelect: () => undefined,
  },
  { id: "freeze", label: "Freeze deploys", group: "Releases", onSelect: () => undefined },
];

const meta = {
  title: "Blocks/Command center",
  component: CommandCenterBlock,
  parameters: { controls: { disable: true }, layout: "padded" },
  decorators: [withPageWidth],
} satisfies Meta<typeof CommandCenterBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An outage in progress. Press ⌘K, or click Actions. */
export const Outage: Story = {
  args: {
    services: SERVICES,
    incidents: INCIDENTS,
    capacity: CAPACITY,
    logs: makeLogs(240),
    actions: ACTIONS,
    updatedAt: "2026-03-04T09:14:00Z",
    updatedLabel: "10 seconds ago",
    onDownloadLogs: () => undefined,
  },
};

export const AllClear: Story = {
  args: {
    ...Outage.args,
    services: SERVICES.map((service) => ({ ...service, health: "operational" as const })),
    incidents: INCIDENTS.filter((incident) => incident.status === "resolved"),
    logs: makeLogs(40).filter((line) => line.level !== "error"),
  },
};

export const NothingWatched: Story = {
  args: { services: [], actions: ACTIONS },
};
