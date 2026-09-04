import {
  DashboardBlock,
  type DashboardEvent,
  type DashboardStat,
} from "@/components/blocks/dashboard";
import { OnboardingBlock, type OnboardingStep } from "@/components/blocks/onboarding";

/**
 * Replace these with your own data.
 *
 * They are inline rather than fetched so the page renders the moment it is
 * generated — a scaffold that needs a database before it shows anything is a
 * scaffold nobody sees working.
 */
const STATS: DashboardStat[] = [
  {
    id: "mrr",
    label: "Monthly revenue",
    value: "$48,120",
    change: 12.4,
    comparison: "on last month",
  },
  {
    id: "users",
    label: "Active users",
    value: "2,410",
    change: 4.2,
    comparison: "on last week",
  },
  { id: "churn", label: "Churn", value: "1.8%", change: 0.4, higherIsBetter: false },
  { id: "uptime", label: "Uptime", value: "99.98%" },
];

const EVENTS: DashboardEvent[] = [
  {
    id: "1",
    title: "Deployed to production",
    at: "2026-03-04T09:12:00Z",
    label: "12 minutes ago",
    tone: "success",
  },
  {
    id: "2",
    title: "New customer: Acme Inc.",
    at: "2026-03-04T08:40:00Z",
    label: "44 minutes ago",
  },
];

const STEPS: OnboardingStep[] = [
  { id: "account", title: "Create your account", status: "done" },
  {
    id: "team",
    title: "Invite your team",
    status: "current",
    actionLabel: "Invite",
    estimate: "2 minutes",
  },
  { id: "billing", title: "Add a payment method", status: "todo", actionLabel: "Add" },
];

export default function AppPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardBlock stats={STATS} events={EVENTS} />
      <OnboardingBlock steps={STEPS} />
    </div>
  );
}
