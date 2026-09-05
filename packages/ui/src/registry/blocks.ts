import type { ComponentMeta } from "./schema";

import { meta as adminDashboardMeta } from "@/blocks/admin-dashboard/meta";
import { meta as adminUsersMeta } from "@/blocks/admin-users/meta";
import { meta as agentConsoleMeta } from "@/blocks/agent-console/meta";
import { meta as aiChatMeta } from "@/blocks/ai-chat/meta";
import { meta as aiDashboardMeta } from "@/blocks/ai-dashboard/meta";
import { meta as aiWorkspaceMeta } from "@/blocks/ai-workspace/meta";
import { meta as analyticsMeta } from "@/blocks/analytics/meta";
import { meta as billingMeta } from "@/blocks/billing/meta";
import { meta as commandCenterMeta } from "@/blocks/command-center/meta";
import { meta as crmMeta } from "@/blocks/crm/meta";
import { meta as dashboardMeta } from "@/blocks/dashboard/meta";
import { meta as forgotPasswordMeta } from "@/blocks/forgot-password/meta";
import { meta as loginMeta } from "@/blocks/login/meta";
import { meta as onboardingMeta } from "@/blocks/onboarding/meta";
import { meta as pricingMeta } from "@/blocks/pricing/meta";
import { meta as settingsMeta } from "@/blocks/settings/meta";
import { meta as signupMeta } from "@/blocks/signup/meta";

/**
 * Every block in the registry.
 *
 * Kept separate from `componentMetas` for the same reason blocks install into a
 * different directory: they are whole page sections, browsed and used
 * differently from the components they are assembled out of.
 *
 * `meta.test.ts` fails if a block directory exists that is missing from here.
 */
export const blockMetas: ComponentMeta[] = [
  adminDashboardMeta,
  adminUsersMeta,
  agentConsoleMeta,
  aiChatMeta,
  aiDashboardMeta,
  aiWorkspaceMeta,
  analyticsMeta,
  billingMeta,
  commandCenterMeta,
  crmMeta,
  dashboardMeta,
  forgotPasswordMeta,
  loginMeta,
  onboardingMeta,
  pricingMeta,
  settingsMeta,
  signupMeta,
];
