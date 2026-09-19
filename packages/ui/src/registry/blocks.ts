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
import { meta as ctaBannerMeta } from "@/blocks/cta-banner/meta";
import { meta as ctaCenteredMeta } from "@/blocks/cta-centered/meta";
import { meta as ctaSplitImageMeta } from "@/blocks/cta-split-image/meta";
import { meta as faqAccordionMeta } from "@/blocks/faq-accordion/meta";
import { meta as faqCategorizedMeta } from "@/blocks/faq-categorized/meta";
import { meta as faqSearchableMeta } from "@/blocks/faq-searchable/meta";
import { meta as faqTabbedGridMeta } from "@/blocks/faq-tabbed-grid/meta";
import { meta as featuresAlternatingMeta } from "@/blocks/features-alternating/meta";
import { meta as featuresBentoMeta } from "@/blocks/features-bento/meta";
import { meta as featuresIconGridMeta } from "@/blocks/features-icon-grid/meta";
import { meta as footerMegaMeta } from "@/blocks/footer-mega/meta";
import { meta as footerMinimalMeta } from "@/blocks/footer-minimal/meta";
import { meta as footerNewsletterMeta } from "@/blocks/footer-newsletter/meta";
import { meta as footerSimpleMeta } from "@/blocks/footer-simple/meta";
import { meta as heroGridMeta } from "@/blocks/hero-grid/meta";
import { meta as heroMinimalMeta } from "@/blocks/hero-minimal/meta";
import { meta as heroPerspectiveGridMeta } from "@/blocks/hero-perspective-grid/meta";
import { meta as heroProductMeta } from "@/blocks/hero-product/meta";
import { meta as heroSplitImageMeta } from "@/blocks/hero-split-image/meta";
import { meta as heroSpotlightMeta } from "@/blocks/hero-spotlight/meta";
import { meta as logoCloudSimpleMeta } from "@/blocks/logo-cloud-simple/meta";
import { meta as logoGridTooltipsMeta } from "@/blocks/logo-grid-tooltips/meta";
import { meta as logoLinksMarqueeMeta } from "@/blocks/logo-links-marquee/meta";
import { meta as logoMarqueeMeta } from "@/blocks/logo-marquee/meta";
import { meta as pricingSinglePlanMeta } from "@/blocks/pricing-single-plan/meta";
import { meta as pricingThreeTierMeta } from "@/blocks/pricing-three-tier/meta";
import { meta as pricingTwoTierMeta } from "@/blocks/pricing-two-tier/meta";
import { meta as statsGridMeta } from "@/blocks/stats-grid/meta";
import { meta as statsTrendCardsMeta } from "@/blocks/stats-trend-cards/meta";
import { meta as teamCarouselMeta } from "@/blocks/team-carousel/meta";
import { meta as teamGridMeta } from "@/blocks/team-grid/meta";
import { meta as testimonialRotatorMeta } from "@/blocks/testimonial-rotator/meta";
import { meta as testimonialSpotlightMeta } from "@/blocks/testimonial-spotlight/meta";
import { meta as testimonialStarGridMeta } from "@/blocks/testimonial-star-grid/meta";

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
  ctaBannerMeta,
  ctaCenteredMeta,
  ctaSplitImageMeta,
  faqAccordionMeta,
  faqCategorizedMeta,
  faqSearchableMeta,
  faqTabbedGridMeta,
  featuresAlternatingMeta,
  featuresBentoMeta,
  featuresIconGridMeta,
  footerMegaMeta,
  footerMinimalMeta,
  footerNewsletterMeta,
  footerSimpleMeta,
  heroGridMeta,
  heroMinimalMeta,
  heroPerspectiveGridMeta,
  heroProductMeta,
  heroSplitImageMeta,
  heroSpotlightMeta,
  logoCloudSimpleMeta,
  logoGridTooltipsMeta,
  logoLinksMarqueeMeta,
  logoMarqueeMeta,
  pricingSinglePlanMeta,
  pricingThreeTierMeta,
  pricingTwoTierMeta,
  statsGridMeta,
  statsTrendCardsMeta,
  teamCarouselMeta,
  teamGridMeta,
  testimonialRotatorMeta,
  testimonialSpotlightMeta,
  testimonialStarGridMeta,
];
