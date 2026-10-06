/**
 * Reading a component's source for what its type and markup already say.
 *
 * Its own entry point, because it loads the TypeScript compiler: the registry
 * build and the documentation site use it at build time, and nothing that runs
 * in a user's project should pay for it.
 */
export { capabilitiesOf, hasClientDirective } from "./capabilities";
export { extractProps, type PropRow, type PropsGroup } from "./props";
export { assess, type CheckState, type ComponentQuality, type QualityCheck } from "./quality";
export { extractVariants, type VariantAxis } from "./variants";
