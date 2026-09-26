import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";

import {
  NlFilter,
  applyFilters,
  createFilterParser,
  describeFilter,
  parseFilterText,
  type FilterChip,
  type FilterDraft,
  type FilterField,
  type FilterParser,
  type NlFilterProps,
} from "./nl-filter";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-3xl">
    <Story />
  </div>
);

const FIELDS: FilterField[] = [
  {
    key: "status",
    label: "Status",
    type: "enum",
    options: [
      { value: "succeeded", label: "Succeeded" },
      { value: "failed", label: "Failed" },
      { value: "cancelled", label: "Cancelled" },
      { value: "in_progress", label: "In progress" },
    ],
  },
  { key: "service", label: "Service", type: "text", synonyms: ["app"] },
  { key: "branch", label: "Branch", type: "text", synonyms: ["on", "ref"] },
  { key: "author", label: "Author", type: "text", synonyms: ["by"] },
  { key: "minutes", label: "Duration (min)", type: "number", synonyms: ["duration", "took"] },
  { key: "deployedOn", label: "Deployed", type: "date", synonyms: ["date"] },
  { key: "message", label: "Message", type: "text", synonyms: ["commit"] },
];

interface Deploy {
  id: string;
  status: "succeeded" | "failed" | "cancelled" | "in_progress";
  service: string;
  branch: string;
  author: string;
  minutes: number;
  deployedOn: string;
  message: string;
}

const DEPLOYS: Deploy[] = [
  {
    id: "d-118",
    status: "failed",
    service: "api",
    branch: "main",
    author: "dana",
    minutes: 7,
    deployedOn: "2026-09-25",
    message: "Retry webhooks on 502",
  },
  {
    id: "d-117",
    status: "succeeded",
    service: "web",
    branch: "main",
    author: "sam",
    minutes: 4,
    deployedOn: "2026-09-25",
    message: "Fix login redirect loop",
  },
  {
    id: "d-116",
    status: "failed",
    service: "web",
    branch: "feature/billing",
    author: "ana",
    minutes: 12,
    deployedOn: "2026-09-24",
    message: "New invoice layout",
  },
  {
    id: "d-115",
    status: "cancelled",
    service: "api",
    branch: "main",
    author: "dana",
    minutes: 1,
    deployedOn: "2026-09-23",
    message: "Bump node to 24",
  },
  {
    id: "d-114",
    status: "succeeded",
    service: "worker",
    branch: "main",
    author: "lee",
    minutes: 9,
    deployedOn: "2026-09-22",
    message: "Batch email sends",
  },
  {
    id: "d-113",
    status: "in_progress",
    service: "api",
    branch: "release/2.4",
    author: "sam",
    minutes: 3,
    deployedOn: "2026-09-26",
    message: "Release 2.4.0",
  },
  {
    id: "d-112",
    status: "failed",
    service: "worker",
    branch: "main",
    author: "lee",
    minutes: 15,
    deployedOn: "2026-09-18",
    message: "Move queue to new region",
  },
  {
    id: "d-111",
    status: "succeeded",
    service: "web",
    branch: "feature/search",
    author: "ana",
    minutes: 5,
    deployedOn: "2026-09-17",
    message: "Search suggestions",
  },
  {
    id: "d-110",
    status: "failed",
    service: "api",
    branch: "main",
    author: "sam",
    minutes: 6,
    deployedOn: "2026-09-15",
    message: "Rate limit per token",
  },
  {
    id: "d-109",
    status: "succeeded",
    service: "api",
    branch: "main",
    author: "dana",
    minutes: 5,
    deployedOn: "2026-09-12",
    message: "Flaky login test fixed",
  },
];

const STATUS_LABEL: Record<Deploy["status"], string> = {
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  in_progress: "In progress",
};

const STATUS_VARIANT = {
  succeeded: "success",
  failed: "destructive",
  cancelled: "outline",
  in_progress: "info",
} as const;

function DeployTable({ chips }: { chips: FilterChip[] }) {
  const rows = applyFilters(DEPLOYS, chips, FIELDS);
  return (
    <Table>
      <TableCaption>
        {rows.length === DEPLOYS.length
          ? `All ${String(DEPLOYS.length)} deploys`
          : `${String(rows.length)} of ${String(DEPLOYS.length)} deploys`}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Deploy</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Author</TableHead>
          <TableHead className="text-end">Minutes</TableHead>
          <TableHead>Deployed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <span className="font-medium">{row.id}</span>
              <span className="block text-xs text-muted-foreground">{row.message}</span>
            </TableCell>
            <TableCell>
              {/* The label says the status; the colour only repeats it. */}
              <Badge size="sm" variant={STATUS_VARIANT[row.status]}>
                {STATUS_LABEL[row.status]}
              </Badge>
            </TableCell>
            <TableCell>{row.service}</TableCell>
            <TableCell>{row.branch}</TableCell>
            <TableCell>{row.author}</TableCell>
            <TableCell className="text-end tabular-nums">{row.minutes}</TableCell>
            <TableCell>{row.deployedOn}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Filters a list of deploys, showing the rows the chips let through. */
function Deploys(props: Partial<NlFilterProps>) {
  const [chips, setChips] = useState<FilterChip[]>(props.defaultValue ?? []);
  return (
    <div className="flex flex-col gap-4">
      <NlFilter
        fields={FIELDS}
        {...props}
        defaultValue={undefined}
        value={chips}
        onValueChange={setChips}
      />
      <DeployTable chips={chips} />
    </div>
  );
}

// "deploys" names the rows, so it is not reported as not understood.
const deployParser = createFilterParser({ ignore: ["deploy", "deployment"] });

const meta = {
  title: "Data/NL Filter",
  component: NlFilter,
  decorators: [withWidth],
  args: {
    fields: FIELDS,
    label: "Filter deploys",
    placeholder: "Try: failed on main took over 5",
    parse: deployParser,
    searchField: "message",
  },
} satisfies Meta<typeof NlFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Type "failed on main took over 5" and press Enter: Status is Failed, Branch
 * is main and Duration greater than 5 appear as chips, and the table keeps the
 * three deploys that match. Click a chip to change it; Backspace in the empty
 * field removes the last one.
 */
export const Default: Story = {
  render: (args) => <Deploys {...args} />,
};

const TODAY = "2026-09-26";

function daysBefore(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Replaced by a newer filter", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Stands in for a model call: it waits, honours the abort signal, and knows
 * what the plain parser deliberately does not — relative dates, and "slow".
 * A real one would send the text and `fields` to a model and return its JSON;
 * the component checks every filter against the fields before showing it.
 */
const modelParser: FilterParser = async (text, fields, signal) => {
  await wait(1200, signal);
  const chips: FilterDraft[] = [];
  let rest = text;
  const phrases: [RegExp, FilterDraft][] = [
    [/\bthis week\b/i, { field: "deployedOn", operator: ">=", value: daysBefore(TODAY, 6) }],
    [
      /\blast week\b/i,
      { field: "deployedOn", operator: "before", value: daysBefore(TODAY, 6) },
    ],
    [/\byesterday\b/i, { field: "deployedOn", operator: "is", value: daysBefore(TODAY, 1) }],
    [/\btoday\b/i, { field: "deployedOn", operator: "is", value: TODAY }],
    [/\bslow\b/i, { field: "minutes", operator: ">", value: 10 }],
  ];
  for (const [pattern, chip] of phrases) {
    if (pattern.test(rest)) {
      chips.push(chip);
      rest = rest.replace(pattern, " ");
    }
  }
  const parsed = await deployParser(rest, fields, signal);
  return { ...parsed, chips: [...chips, ...parsed.chips] };
};

/**
 * An async parser with a delay, as a model call would have. While it works the
 * field is busy, a spinner shows and the hint says Escape stops it; pressing
 * Enter again aborts the first call. Try "slow failed deploys this week".
 */
export const ModelParser: Story = {
  args: {
    parse: modelParser,
    placeholder: "Try: slow failed deploys this week",
    hint: "Understands relative dates like “this week” and “yesterday”. Press Enter to filter.",
  },
  render: (args) => <Deploys {...args} />,
};

/**
 * The plain parser cannot read "this week" — it has no clock — so after
 * Enter the words stay in the field, named as not understood, with the offer
 * to search messages for them instead.
 */
export const NotUnderstood: Story = {
  args: {
    parse: parseFilterText,
    placeholder: "Try: failed this week",
  },
  render: (args) => <Deploys {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Filter deploys" }),
      "failed this week{Enter}",
    );
  },
};

/** Controlled: the chips live in the parent, which can read, save or reset them. */
export const Controlled: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [chips, setChips] = useState<FilterChip[]>([
      { id: "saved-1", field: "service", operator: "is", value: "api" },
      { id: "saved-2", field: "status", operator: "is not", value: "succeeded" },
    ]);
    return (
      <div className="flex flex-col gap-3">
        <NlFilter
          fields={FIELDS}
          label="Filter deploys"
          parse={deployParser}
          value={chips}
          onValueChange={setChips}
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setChips([]);
            }}
          >
            Clear filters
          </Button>
          <span className="text-sm text-muted-foreground">
            {chips.length === 0
              ? "No filters"
              : chips.map((chip) => describeFilter(chip, FIELDS)).join("; ")}
          </span>
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(chips, null, 2)}
        </pre>
      </div>
    );
  },
};
