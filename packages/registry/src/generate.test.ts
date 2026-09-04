import { describe, expect, it } from "vitest";

import { blocksPathFor, planUi, renderBrief, renderPlan } from "./generate";
import { registryIndexSchema, type RegistryIndex } from "./schema";
import { buildIndex, buildRegistry } from "./build";

/** The real catalogue, so the matcher is exercised against real prose. */
const index: RegistryIndex = registryIndexSchema.parse(buildIndex(buildRegistry()));

function names(plan: ReturnType<typeof planUi>): string[] {
  return [...plan.blocks, ...plan.components].map((item) => item.entry.name);
}

describe("planUi", () => {
  it("prefers the block that covers an intent", () => {
    expect(names(planUi("a billing page with usage and invoices", index))).toContain("billing");
  });

  it("bridges the words a person types to the name an item has", () => {
    // No string similarity gets from "sign in" to "login".
    expect(names(planUi("sign in screen", index))).toContain("login");
    expect(names(planUi("let people register", index))).toContain("signup");
    expect(names(planUi("reset password flow", index))).toContain("forgot-password");
  });

  it("does not suggest a component a chosen block already installs", () => {
    const plan = planUi("a dashboard with metrics and recent activity", index);

    const covered = new Set(plan.blocks.flatMap((item) => item.entry.registryDependencies));
    for (const component of plan.components) {
      expect(covered.has(component.entry.name), component.entry.name).toBe(false);
    }
  });

  it("does not let the synonym table's word also match by name elsewhere", () => {
    // "plan" means pricing or billing here. Scoring `ai-agent-plan` for the same
    // word puts it on a billing page and undoes what the table is for.
    expect(names(planUi("a billing page showing the plan and invoices", index))).not.toContain(
      "ai-agent-plan",
    );
  });

  it("does not surface an item that merely shares a word with the prompt", () => {
    const plan = planUi("a console for watching agents run", index);

    // `ai-dashboard` contains "run" in its prose and nothing else; a preference
    // for blocks must order real matches, not manufacture one.
    expect(names(plan)).toContain("agent-console");
    expect(names(plan)).not.toContain("ai-dashboard");
  });

  it("says it found nothing rather than inventing something", () => {
    const plan = planUi("a purple hovercraft", index);

    expect(plan.empty).toBe(true);
    expect(plan.install).toEqual([]);
  });

  it("only ever names items that are in the registry", () => {
    // The property that makes the output trustworthy: it cannot invent.
    const known = new Set(index.items.map((item) => item.name));

    for (const prompt of [
      "an AI customer support dashboard with tickets and an assistant",
      "settings with notifications and an API key",
      "a table of users with roles and permissions",
      "onboarding checklist",
    ]) {
      for (const name of names(planUi(prompt, index))) {
        expect(known.has(name), `${prompt} → ${name}`).toBe(true);
      }
    }
  });

  it("explains every choice", () => {
    for (const item of [...planUi("a chat assistant", index).blocks]) {
      expect(item.because.length).toBeGreaterThan(0);
    }
  });

  it("respects the limits it is given", () => {
    const plan = planUi("dashboard with metrics table and chat", index, {
      maxBlocks: 1,
      maxComponents: 2,
    });

    expect(plan.blocks.length).toBeLessThanOrEqual(1);
    expect(plan.components.length).toBeLessThanOrEqual(2);
  });

  it("is not tripped by punctuation or case", () => {
    const plain = names(planUi("billing page", index));
    const noisy = names(planUi("A Billing Page!!! (with usage)", index));

    expect(noisy).toEqual(expect.arrayContaining(plain));
  });

  it("does not match a synonym inside a longer word", () => {
    // "key" must not fire on "keyboard".
    expect(names(planUi("keyboard navigation", index))).not.toContain("secret-field");
  });
});

describe("renderPlan", () => {
  const plan = planUi("a billing page with usage and invoices", index);

  it("imports blocks from the blocks alias and components from the ui alias", () => {
    const code = renderPlan(plan, { importFrom: "@/components/ui" });

    expect(code).toContain('from "@/components/blocks/billing"');
    expect(code).not.toContain('from "@/components/ui/billing"');
  });

  it("names a block's export with the Block suffix it actually has", () => {
    expect(renderPlan(plan)).toContain("<BillingBlock />");
  });

  it("points at the documentation instead of inventing props", () => {
    const code = renderPlan(plan);

    // A plausible invented prop is worse than an obvious gap: one is a TODO,
    // the other is a bug that looks like working code.
    expect(code).toContain("/docs/blocks/billing");
    expect(code).not.toMatch(/<BillingBlock\s+\w+=/);
  });

  it("says so when nothing matched", () => {
    expect(renderPlan(planUi("a purple hovercraft", index))).toContain(
      "Nothing in the registry",
    );
  });
});

describe("renderBrief", () => {
  const plan = planUi("a billing page with usage and invoices", index);
  const brief = renderBrief(plan);

  it("tells the agent not to write its own versions", () => {
    expect(brief).toContain("Do not write your own versions");
  });

  it("carries the exact install command", () => {
    expect(brief).toContain(`add ${plan.install.join(" ")}`);
  });

  it("sends the agent to the props rather than letting it guess", () => {
    expect(brief).toContain("read the page rather than guessing");
  });

  it("repeats the token rule, which is the other thing agents get wrong", () => {
    expect(brief).toContain("semantic tokens");
  });

  it("does not pretend to a plan when there is none", () => {
    expect(renderBrief(planUi("a purple hovercraft", index))).toContain(
      "Nothing in the registry",
    );
  });
});

describe("blocksPathFor", () => {
  it("finds the sibling blocks directory of a ui alias", () => {
    expect(blocksPathFor("@/components/ui")).toBe("@/components/blocks");
    expect(blocksPathFor("~/components/ui")).toBe("~/components/blocks");
  });

  it("appends to a project alias that is not the ui directory", () => {
    expect(blocksPathFor("@/ui")).toBe("@/blocks");
  });

  it("does not invent a block path under a package specifier", () => {
    // Blocks are not exported from the component package at all — they are only
    // ever installed as source — so `@dowel-ui/react/blocks/billing` is an
    // import that resolves nowhere.
    expect(blocksPathFor("@dowel-ui/react")).toBe("@/components/blocks");
  });
});
