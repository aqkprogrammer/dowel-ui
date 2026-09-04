import { AiDashboardBlock } from "@/components/blocks/ai-dashboard";

export default function UsagePage() {
  return (
    <AiDashboardBlock
      tokens={15_480_000}
      previousTokens={11_200_000}
      spend="$252.50"
      spendValue={252.5}
      previousSpendValue={198.4}
      runs={3_470}
      previousRuns={2_910}
      failureRate={0.041}
      previousFailureRate={0.062}
      models={[
        { id: "opus", model: "claude-opus-5", runs: 118, tokens: 4_240_000, cost: "$182.40" },
        {
          id: "sonnet",
          model: "claude-sonnet-5",
          runs: 942,
          tokens: 8_060_000,
          cost: "$61.20",
        },
        {
          id: "haiku",
          model: "claude-haiku-4-5",
          runs: 2_410,
          tokens: 3_180_000,
          cost: "$8.90",
        },
      ]}
      recentRuns={[
        {
          id: "r1",
          title: "Deduplicate contacts",
          state: "working",
          model: "claude-opus-5",
          tokens: 42_180,
          href: "/app/agents",
        },
        {
          id: "r2",
          title: "Draft weekly digest",
          state: "waiting",
          model: "claude-sonnet-5",
          tokens: 18_400,
        },
        {
          id: "r3",
          title: "Classify inbound tickets",
          state: "done",
          model: "claude-haiku-4-5",
          tokens: 6_120,
        },
      ]}
    />
  );
}
