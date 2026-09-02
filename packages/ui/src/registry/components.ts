import type { ComponentMeta } from "./schema";

import { meta as accordionMeta } from "@/components/accordion/meta";
import { meta as activityFeedMeta } from "@/components/activity-feed/meta";
import { meta as aiActionLedgerMeta } from "@/components/ai-action-ledger/meta";
import { meta as aiAgentStatusMeta } from "@/components/ai-agent-status/meta";
import { meta as aiConversationMeta } from "@/components/ai-conversation/meta";
import { meta as aiInlineCompletionMeta } from "@/components/ai-inline-completion/meta";
import { meta as aiMessageMeta } from "@/components/ai-message/meta";
import { meta as aiModelSelectorMeta } from "@/components/ai-model-selector/meta";
import { meta as aiPromptInputMeta } from "@/components/ai-prompt-input/meta";
import { meta as aiReasoningMeta } from "@/components/ai-reasoning/meta";
import { meta as aiResponseMeta } from "@/components/ai-response/meta";
import { meta as aiSourcesMeta } from "@/components/ai-sources/meta";
import { meta as aiStructuredOutputMeta } from "@/components/ai-structured-output/meta";
import { meta as aiTokenUsageMeta } from "@/components/ai-token-usage/meta";
import { meta as aiToolMeta } from "@/components/ai-tool/meta";
import { meta as alertMeta } from "@/components/alert/meta";
import { meta as avatarMeta } from "@/components/avatar/meta";
import { meta as badgeMeta } from "@/components/badge/meta";
import { meta as buttonMeta } from "@/components/button/meta";
import { meta as calendarMeta } from "@/components/calendar/meta";
import { meta as cardMeta } from "@/components/card/meta";
import { meta as checkboxMeta } from "@/components/checkbox/meta";
import { meta as codeBlockMeta } from "@/components/code-block/meta";
import { meta as comboboxMeta } from "@/components/combobox/meta";
import { meta as commandMeta } from "@/components/command/meta";
import { meta as dataTableMeta } from "@/components/data-table/meta";
import { meta as datePickerMeta } from "@/components/date-picker/meta";
import { meta as dialogMeta } from "@/components/dialog/meta";
import { meta as drawerMeta } from "@/components/drawer/meta";
import { meta as dropdownMenuMeta } from "@/components/dropdown-menu/meta";
import { meta as emptyStateMeta } from "@/components/empty-state/meta";
import { meta as formMeta } from "@/components/form/meta";
import { meta as inputMeta } from "@/components/input/meta";
import { meta as labelMeta } from "@/components/label/meta";
import { meta as meterMeta } from "@/components/meter/meta";
import { meta as metricDeltaMeta } from "@/components/metric-delta/meta";
import { meta as paginationMeta } from "@/components/pagination/meta";
import { meta as popoverMeta } from "@/components/popover/meta";
import { meta as progressMeta } from "@/components/progress/meta";
import { meta as radioGroupMeta } from "@/components/radio-group/meta";
import { meta as recordDiffMeta } from "@/components/record-diff/meta";
import { meta as selectMeta } from "@/components/select/meta";
import { meta as separatorMeta } from "@/components/separator/meta";
import { meta as sheetMeta } from "@/components/sheet/meta";
import { meta as skeletonMeta } from "@/components/skeleton/meta";
import { meta as sliderMeta } from "@/components/slider/meta";
import { meta as spinnerMeta } from "@/components/spinner/meta";
import { meta as switchMeta } from "@/components/switch/meta";
import { meta as tableMeta } from "@/components/table/meta";
import { meta as tabsMeta } from "@/components/tabs/meta";
import { meta as tagsInputMeta } from "@/components/tags-input/meta";
import { meta as toastMeta } from "@/components/toast/meta";
import { meta as tooltipMeta } from "@/components/tooltip/meta";

/**
 * Every component in the registry.
 *
 * An explicit list rather than a glob: the registry build runs in plain Node,
 * where bundler-only globbing is unavailable, and a static list is also what
 * lets the bundle tree-shake. `meta.test.ts` fails if a component directory
 * exists that is missing from here, so it cannot silently fall out of date.
 *
 * Identifiers carry a `Meta` suffix because component names include reserved
 * words — `switch` cannot be a binding name.
 */
export const componentMetas: ComponentMeta[] = [
  accordionMeta,
  activityFeedMeta,
  aiActionLedgerMeta,
  aiAgentStatusMeta,
  aiConversationMeta,
  aiInlineCompletionMeta,
  aiMessageMeta,
  aiModelSelectorMeta,
  aiPromptInputMeta,
  aiReasoningMeta,
  aiResponseMeta,
  aiSourcesMeta,
  aiStructuredOutputMeta,
  aiTokenUsageMeta,
  aiToolMeta,
  alertMeta,
  avatarMeta,
  badgeMeta,
  buttonMeta,
  calendarMeta,
  cardMeta,
  checkboxMeta,
  codeBlockMeta,
  comboboxMeta,
  commandMeta,
  dataTableMeta,
  datePickerMeta,
  dialogMeta,
  drawerMeta,
  dropdownMenuMeta,
  emptyStateMeta,
  formMeta,
  inputMeta,
  labelMeta,
  meterMeta,
  metricDeltaMeta,
  paginationMeta,
  popoverMeta,
  progressMeta,
  radioGroupMeta,
  recordDiffMeta,
  selectMeta,
  separatorMeta,
  sheetMeta,
  skeletonMeta,
  sliderMeta,
  spinnerMeta,
  switchMeta,
  tableMeta,
  tabsMeta,
  tagsInputMeta,
  toastMeta,
  tooltipMeta,
];

// This file is the `@dowel-ui/react/registry` entry point, so the block barrel is
// re-exported here — the registry build reads both through one import.
export { blockMetas } from "./blocks";
export { COMPONENT_CATEGORIES, COMPONENT_STATUSES } from "./schema";
export type { ComponentCategory, ComponentMeta, ComponentStatus } from "./schema";
