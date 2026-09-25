import type { ComponentMeta } from "./schema";

import { meta as accordionMeta } from "@/components/accordion/meta";
import { meta as activityFeedMeta } from "@/components/activity-feed/meta";
import { meta as aiActionLedgerMeta } from "@/components/ai-action-ledger/meta";
import { meta as aiAgentPlanMeta } from "@/components/ai-agent-plan/meta";
import { meta as aiAgentStatusMeta } from "@/components/ai-agent-status/meta";
import { meta as aiApprovalRequestMeta } from "@/components/ai-approval-request/meta";
import { meta as aiConversationMeta } from "@/components/ai-conversation/meta";
import { meta as aiDisclosureMeta } from "@/components/ai-disclosure/meta";
import { meta as aiExtractionReviewMeta } from "@/components/ai-extraction-review/meta";
import { meta as aiInlineCompletionMeta } from "@/components/ai-inline-completion/meta";
import { meta as aiMessageMeta } from "@/components/ai-message/meta";
import { meta as aiModelSelectorMeta } from "@/components/ai-model-selector/meta";
import { meta as aiPromptInputMeta } from "@/components/ai-prompt-input/meta";
import { meta as aiReasoningMeta } from "@/components/ai-reasoning/meta";
import { meta as aiResponseMeta } from "@/components/ai-response/meta";
import { meta as aiSourcesMeta } from "@/components/ai-sources/meta";
import { meta as aiStructuredOutputMeta } from "@/components/ai-structured-output/meta";
import { meta as aiSuggestedValueMeta } from "@/components/ai-suggested-value/meta";
import { meta as aiTokenUsageMeta } from "@/components/ai-token-usage/meta";
import { meta as aiToolMeta } from "@/components/ai-tool/meta";
import { meta as alertMeta } from "@/components/alert/meta";
import { meta as avatarMeta } from "@/components/avatar/meta";
import { meta as badgeMeta } from "@/components/badge/meta";
import { meta as breadcrumbMeta } from "@/components/breadcrumb/meta";
import { meta as buttonMeta } from "@/components/button/meta";
import { meta as calendarMeta } from "@/components/calendar/meta";
import { meta as cardMeta } from "@/components/card/meta";
import { meta as checkboxMeta } from "@/components/checkbox/meta";
import { meta as codeBlockMeta } from "@/components/code-block/meta";
import { meta as collapsibleMeta } from "@/components/collapsible/meta";
import { meta as comboboxMeta } from "@/components/combobox/meta";
import { meta as commandMeta } from "@/components/command/meta";
import { meta as confirmTypedMeta } from "@/components/confirm-typed/meta";
import { meta as cronEditorMeta } from "@/components/cron-editor/meta";
import { meta as dataTableMeta } from "@/components/data-table/meta";
import { meta as datePickerMeta } from "@/components/date-picker/meta";
import { meta as directionMeta } from "@/components/direction/meta";
import { meta as dialogMeta } from "@/components/dialog/meta";
import { meta as diffViewerMeta } from "@/components/diff-viewer/meta";
import { meta as dnsRecordMeta } from "@/components/dns-record/meta";
import { meta as drawerMeta } from "@/components/drawer/meta";
import { meta as dropdownMenuMeta } from "@/components/dropdown-menu/meta";
import { meta as emptyStateMeta } from "@/components/empty-state/meta";
import { meta as fileUploadMeta } from "@/components/file-upload/meta";
import { meta as formMeta } from "@/components/form/meta";
import { meta as inputMeta } from "@/components/input/meta";
import { meta as labelMeta } from "@/components/label/meta";
import { meta as logViewerMeta } from "@/components/log-viewer/meta";
import { meta as meterMeta } from "@/components/meter/meta";
import { meta as metricDeltaMeta } from "@/components/metric-delta/meta";
import { meta as paginationMeta } from "@/components/pagination/meta";
import { meta as permissionMatrixMeta } from "@/components/permission-matrix/meta";
import { meta as popoverMeta } from "@/components/popover/meta";
import { meta as progressMeta } from "@/components/progress/meta";
import { meta as radioGroupMeta } from "@/components/radio-group/meta";
import { meta as recordDiffMeta } from "@/components/record-diff/meta";
import { meta as secretFieldMeta } from "@/components/secret-field/meta";
import { meta as selectMeta } from "@/components/select/meta";
import { meta as separatorMeta } from "@/components/separator/meta";
import { meta as sessionExpiryMeta } from "@/components/session-expiry/meta";
import { meta as sidebarMeta } from "@/components/sidebar/meta";
import { meta as sheetMeta } from "@/components/sheet/meta";
import { meta as shortcutRecorderMeta } from "@/components/shortcut-recorder/meta";
import { meta as skeletonMeta } from "@/components/skeleton/meta";
import { meta as sliderMeta } from "@/components/slider/meta";
import { meta as spinnerMeta } from "@/components/spinner/meta";
import { meta as switchMeta } from "@/components/switch/meta";
import { meta as syncStatusMeta } from "@/components/sync-status/meta";
import { meta as tableMeta } from "@/components/table/meta";
import { meta as tabsMeta } from "@/components/tabs/meta";
import { meta as tagsInputMeta } from "@/components/tags-input/meta";
import { meta as timeRangePickerMeta } from "@/components/time-range-picker/meta";
import { meta as textareaMeta } from "@/components/textarea/meta";
import { meta as toastMeta } from "@/components/toast/meta";
import { meta as tooltipMeta } from "@/components/tooltip/meta";
import { meta as dotsLoaderMeta } from "@/components/dots-loader/meta";
import { meta as ringLoaderMeta } from "@/components/ring-loader/meta";
import { meta as barLoaderMeta } from "@/components/bar-loader/meta";
import { meta as shapeLoaderMeta } from "@/components/shape-loader/meta";
import { meta as textLoaderMeta } from "@/components/text-loader/meta";
import { meta as gridLoaderMeta } from "@/components/grid-loader/meta";
import { meta as morphButtonMeta } from "@/components/morph-button/meta";
import { meta as effectButtonMeta } from "@/components/effect-button/meta";
import { meta as magneticButtonMeta } from "@/components/magnetic-button/meta";
import { meta as dotMorphButtonMeta } from "@/components/dot-morph-button/meta";
import { meta as focusBlurLinksMeta } from "@/components/focus-blur-links/meta";
import { meta as copyButtonMeta } from "@/components/copy-button/meta";
import { meta as textEffectMeta } from "@/components/text-effect/meta";
import { meta as textSwapMeta } from "@/components/text-swap/meta";
import { meta as shimmerTextMeta } from "@/components/shimmer-text/meta";
import { meta as scrambleTextMeta } from "@/components/scramble-text/meta";
import { meta as typewriterTextMeta } from "@/components/typewriter-text/meta";
import { meta as scrollRevealTextMeta } from "@/components/scroll-reveal-text/meta";
import { meta as numberFlowMeta } from "@/components/number-flow/meta";
import { meta as cardSpreadMeta } from "@/components/card-spread/meta";
import { meta as carousel3dMeta } from "@/components/carousel-3d/meta";
import { meta as timeStackMeta } from "@/components/time-stack/meta";
import { meta as expandableCardsMeta } from "@/components/expandable-cards/meta";
import { meta as glowCardMeta } from "@/components/glow-card/meta";
import { meta as photoStackMeta } from "@/components/photo-stack/meta";
import { meta as cardStackMeta } from "@/components/card-stack/meta";
import { meta as bookMeta } from "@/components/book/meta";
import { meta as productCardMeta } from "@/components/product-card/meta";
import { meta as marqueeMeta } from "@/components/marquee/meta";
import { meta as reviewsCarouselMeta } from "@/components/reviews-carousel/meta";
import { meta as inviteCarouselMeta } from "@/components/invite-carousel/meta";
import { meta as swipeCarouselMeta } from "@/components/swipe-carousel/meta";
import { meta as imageAccordionMeta } from "@/components/image-accordion/meta";
import { meta as tiltCardMeta } from "@/components/tilt-card/meta";
import { meta as ditherCanvasMeta } from "@/components/dither-canvas/meta";
import { meta as ditherDonutMeta } from "@/components/dither-donut/meta";
import { meta as ditherBarMeta } from "@/components/dither-bar/meta";
import { meta as ditherAreaMeta } from "@/components/dither-area/meta";
import { meta as ditherLineMeta } from "@/components/dither-line/meta";
import { meta as ditherHeatmapMeta } from "@/components/dither-heatmap/meta";
import { meta as ditherGaugeMeta } from "@/components/dither-gauge/meta";
import { meta as ditherScatterMeta } from "@/components/dither-scatter/meta";
import { meta as ditherFunnelMeta } from "@/components/dither-funnel/meta";
import { meta as ditherMeterMeta } from "@/components/dither-meter/meta";
import { meta as uptimeMatrixMeta } from "@/components/uptime-matrix/meta";
import { meta as avatarGroupMeta } from "@/components/avatar-group/meta";
import { meta as appStackMeta } from "@/components/app-stack/meta";
import { meta as contributionGraphMeta } from "@/components/contribution-graph/meta";
import { meta as starCountMeta } from "@/components/star-count/meta";
import { meta as notificationBadgeMeta } from "@/components/notification-badge/meta";
import { meta as switchboardCardMeta } from "@/components/switchboard-card/meta";
import { meta as islandMeta } from "@/components/island/meta";
import { meta as morphSurfaceMeta } from "@/components/morph-surface/meta";
import { meta as gooeyPopoverMeta } from "@/components/gooey-popover/meta";
import { meta as richPopoverMeta } from "@/components/rich-popover/meta";
import { meta as commentBubbleMeta } from "@/components/comment-bubble/meta";
import { meta as accountMenuMeta } from "@/components/account-menu/meta";
import { meta as exposureSliderMeta } from "@/components/exposure-slider/meta";
import { meta as scrubberMeta } from "@/components/scrubber/meta";
import { meta as imageSelectorMeta } from "@/components/image-selector/meta";
import { meta as imageMetadataMeta } from "@/components/image-metadata/meta";
import { meta as photoTabsMeta } from "@/components/photo-tabs/meta";
import { meta as socialSelectorMeta } from "@/components/social-selector/meta";
import { meta as expandableListMeta } from "@/components/expandable-list/meta";
import { meta as otpInputMeta } from "@/components/otp-input/meta";
import { meta as stepperMeta } from "@/components/stepper/meta";
import { meta as contextMenuMeta } from "@/components/context-menu/meta";
import { meta as tweetCardMeta } from "@/components/tweet-card/meta";
import { meta as cursorFollowMeta } from "@/components/cursor-follow/meta";
import { meta as gradientOrbMeta } from "@/components/gradient-orb/meta";
import { meta as orbFaceMeta } from "@/components/orb-face/meta";
import { meta as pixelAvatarMeta } from "@/components/pixel-avatar/meta";
import { meta as aiLoaderMeta } from "@/components/ai-loader/meta";
import { meta as aiSuggestionsMeta } from "@/components/ai-suggestions/meta";
import { meta as aiBranchMeta } from "@/components/ai-branch/meta";
import { meta as aiArtifactMeta } from "@/components/ai-artifact/meta";
import { meta as shaderTransitionMeta } from "@/components/shader-transition/meta";
import { meta as magneticSelectMeta } from "@/components/magnetic-select/meta";
import { meta as aspectMorphMeta } from "@/components/aspect-morph/meta";
import { meta as createMenuMeta } from "@/components/create-menu/meta";
import { meta as radialMenuMeta } from "@/components/radial-menu/meta";
import { meta as canvasToolbarMeta } from "@/components/canvas-toolbar/meta";
import { meta as gooTabsMeta } from "@/components/goo-tabs/meta";
import { meta as assigneePickerMeta } from "@/components/assignee-picker/meta";
import { meta as selectionListMeta } from "@/components/selection-list/meta";
import { meta as browserTabsMeta } from "@/components/browser-tabs/meta";
import { meta as actionNodeMeta } from "@/components/action-node/meta";
import { meta as gooBallMeta } from "@/components/goo-ball/meta";
import { meta as glassBubbleMeta } from "@/components/glass-bubble/meta";
import { meta as dragStepperMeta } from "@/components/drag-stepper/meta";
import { meta as sloshSliderMeta } from "@/components/slosh-slider/meta";
import { meta as reorderListMeta } from "@/components/reorder-list/meta";
import { meta as magnifyDockMeta } from "@/components/magnify-dock/meta";
import { meta as rangeDialMeta } from "@/components/range-dial/meta";
import { meta as foldingFrameMeta } from "@/components/folding-frame/meta";
import { meta as slideToConfirmMeta } from "@/components/slide-to-confirm/meta";
import { meta as pullToRefreshMeta } from "@/components/pull-to-refresh/meta";
import { meta as todoTowerMeta } from "@/components/todo-tower/meta";
import { meta as paletteGeneratorMeta } from "@/components/palette-generator/meta";
import { meta as inlineConfirmMeta } from "@/components/inline-confirm/meta";
import { meta as liquidToggleMeta } from "@/components/liquid-toggle/meta";
import { meta as animatedChecklistMeta } from "@/components/animated-checklist/meta";
import { meta as nowPlayingMeta } from "@/components/now-playing/meta";
import { meta as notifyButtonMeta } from "@/components/notify-button/meta";
import { meta as tickProgressMeta } from "@/components/tick-progress/meta";
import { meta as escapeButtonMeta } from "@/components/escape-button/meta";
import { meta as expandingSearchMeta } from "@/components/expanding-search/meta";
import { meta as dialMeta } from "@/components/dial/meta";
import { meta as commandBarMeta } from "@/components/command-bar/meta";
import { meta as durationPickerMeta } from "@/components/duration-picker/meta";
import { meta as ratingMeta } from "@/components/rating/meta";
import { meta as holdButtonMeta } from "@/components/hold-button/meta";
import { meta as themeToggleMeta } from "@/components/theme-toggle/meta";
import { meta as emojiReactionMeta } from "@/components/emoji-reaction/meta";
import { meta as notificationBellMeta } from "@/components/notification-bell/meta";
import { meta as likeButtonMeta } from "@/components/like-button/meta";
import { meta as countdownMeta } from "@/components/countdown/meta";
import { meta as folderMeta } from "@/components/folder/meta";
import { meta as gravityFieldMeta } from "@/components/gravity-field/meta";
import { meta as stepPlayerMeta } from "@/components/step-player/meta";
import { meta as matrixOrbMeta } from "@/components/matrix-orb/meta";
import { meta as fluidOrbMeta } from "@/components/fluid-orb/meta";
import { meta as gridRevealMeta } from "@/components/grid-reveal/meta";
import { meta as railNavMeta } from "@/components/rail-nav/meta";
import { meta as minimapNavMeta } from "@/components/minimap-nav/meta";
import { meta as scrollProgressMeta } from "@/components/scroll-progress/meta";
import { meta as gooeyNavMeta } from "@/components/gooey-nav/meta";
import { meta as agentSurfaceMeta } from "@/components/agent-surface/meta";
import { meta as controlBatonMeta } from "@/components/control-baton/meta";
import { meta as streamAnnouncerMeta } from "@/components/stream-announcer/meta";
import { meta as agentApprovalsMeta } from "@/components/agent-approvals/meta";
import { meta as agentLedgerMeta } from "@/components/agent-ledger/meta";
import { meta as agentFormMeta } from "@/components/agent-form/meta";
import { meta as agentDataTableMeta } from "@/components/agent-data-table/meta";

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
  aiAgentPlanMeta,
  aiAgentStatusMeta,
  aiApprovalRequestMeta,
  aiConversationMeta,
  aiDisclosureMeta,
  aiExtractionReviewMeta,
  aiInlineCompletionMeta,
  aiMessageMeta,
  aiModelSelectorMeta,
  aiPromptInputMeta,
  aiReasoningMeta,
  aiResponseMeta,
  aiSourcesMeta,
  aiStructuredOutputMeta,
  aiSuggestedValueMeta,
  aiTokenUsageMeta,
  aiToolMeta,
  alertMeta,
  avatarMeta,
  badgeMeta,
  breadcrumbMeta,
  buttonMeta,
  calendarMeta,
  cardMeta,
  checkboxMeta,
  codeBlockMeta,
  collapsibleMeta,
  comboboxMeta,
  commandMeta,
  confirmTypedMeta,
  cronEditorMeta,
  dataTableMeta,
  datePickerMeta,
  dialogMeta,
  directionMeta,
  diffViewerMeta,
  dnsRecordMeta,
  drawerMeta,
  dropdownMenuMeta,
  emptyStateMeta,
  fileUploadMeta,
  formMeta,
  inputMeta,
  labelMeta,
  logViewerMeta,
  meterMeta,
  metricDeltaMeta,
  paginationMeta,
  permissionMatrixMeta,
  popoverMeta,
  progressMeta,
  radioGroupMeta,
  recordDiffMeta,
  secretFieldMeta,
  selectMeta,
  separatorMeta,
  sessionExpiryMeta,
  sheetMeta,
  sidebarMeta,
  shortcutRecorderMeta,
  skeletonMeta,
  sliderMeta,
  spinnerMeta,
  switchMeta,
  syncStatusMeta,
  tableMeta,
  tabsMeta,
  tagsInputMeta,
  timeRangePickerMeta,
  textareaMeta,
  toastMeta,
  tooltipMeta,
  dotsLoaderMeta,
  ringLoaderMeta,
  barLoaderMeta,
  shapeLoaderMeta,
  textLoaderMeta,
  gridLoaderMeta,
  morphButtonMeta,
  effectButtonMeta,
  magneticButtonMeta,
  dotMorphButtonMeta,
  focusBlurLinksMeta,
  copyButtonMeta,
  textEffectMeta,
  textSwapMeta,
  shimmerTextMeta,
  scrambleTextMeta,
  typewriterTextMeta,
  scrollRevealTextMeta,
  numberFlowMeta,
  cardSpreadMeta,
  carousel3dMeta,
  timeStackMeta,
  expandableCardsMeta,
  glowCardMeta,
  photoStackMeta,
  cardStackMeta,
  bookMeta,
  productCardMeta,
  marqueeMeta,
  reviewsCarouselMeta,
  inviteCarouselMeta,
  swipeCarouselMeta,
  imageAccordionMeta,
  tiltCardMeta,
  ditherCanvasMeta,
  ditherDonutMeta,
  ditherBarMeta,
  ditherAreaMeta,
  ditherLineMeta,
  ditherHeatmapMeta,
  ditherGaugeMeta,
  ditherScatterMeta,
  ditherFunnelMeta,
  ditherMeterMeta,
  uptimeMatrixMeta,
  avatarGroupMeta,
  appStackMeta,
  contributionGraphMeta,
  starCountMeta,
  notificationBadgeMeta,
  switchboardCardMeta,
  islandMeta,
  morphSurfaceMeta,
  gooeyPopoverMeta,
  richPopoverMeta,
  commentBubbleMeta,
  accountMenuMeta,
  exposureSliderMeta,
  scrubberMeta,
  imageSelectorMeta,
  imageMetadataMeta,
  photoTabsMeta,
  socialSelectorMeta,
  expandableListMeta,
  otpInputMeta,
  stepperMeta,
  contextMenuMeta,
  tweetCardMeta,
  cursorFollowMeta,
  gradientOrbMeta,
  orbFaceMeta,
  pixelAvatarMeta,
  aiLoaderMeta,
  aiSuggestionsMeta,
  aiBranchMeta,
  aiArtifactMeta,
  shaderTransitionMeta,
  magneticSelectMeta,
  aspectMorphMeta,
  createMenuMeta,
  radialMenuMeta,
  canvasToolbarMeta,
  gooTabsMeta,
  assigneePickerMeta,
  selectionListMeta,
  browserTabsMeta,
  actionNodeMeta,
  gooBallMeta,
  glassBubbleMeta,
  dragStepperMeta,
  sloshSliderMeta,
  reorderListMeta,
  magnifyDockMeta,
  rangeDialMeta,
  foldingFrameMeta,
  slideToConfirmMeta,
  pullToRefreshMeta,
  todoTowerMeta,
  paletteGeneratorMeta,
  inlineConfirmMeta,
  liquidToggleMeta,
  animatedChecklistMeta,
  nowPlayingMeta,
  notifyButtonMeta,
  tickProgressMeta,
  escapeButtonMeta,
  expandingSearchMeta,
  dialMeta,
  commandBarMeta,
  durationPickerMeta,
  ratingMeta,
  holdButtonMeta,
  themeToggleMeta,
  emojiReactionMeta,
  notificationBellMeta,
  likeButtonMeta,
  countdownMeta,
  folderMeta,
  gravityFieldMeta,
  stepPlayerMeta,
  matrixOrbMeta,
  fluidOrbMeta,
  gridRevealMeta,
  railNavMeta,
  minimapNavMeta,
  scrollProgressMeta,
  gooeyNavMeta,
  agentSurfaceMeta,
  controlBatonMeta,
  streamAnnouncerMeta,
  agentApprovalsMeta,
  agentLedgerMeta,
  agentFormMeta,
  agentDataTableMeta,
];

// This file is the `@dowel-ui/react/registry` entry point, so the block barrel is
// re-exported here — the registry build reads both through one import.
export { blockMetas } from "./blocks";
export { COMPONENT_CATEGORIES, COMPONENT_STATUSES } from "./schema";
export type { ComponentCategory, ComponentMeta, ComponentStatus } from "./schema";
