import type { ComponentMeta } from "./schema";

import { meta as useInViewMeta } from "@/hooks/use-in-view/meta";
import { meta as useReducedMotionMeta } from "@/hooks/use-reduced-motion/meta";

/**
 * Every hook in the registry.
 *
 * Behaviour several components share — whether motion is reduced, whether an
 * element is on screen — installed once into the project's hooks directory and
 * imported by each component that needs it, rather than copied into each.
 */
export const hookMetas: ComponentMeta[] = [useReducedMotionMeta, useInViewMeta];
