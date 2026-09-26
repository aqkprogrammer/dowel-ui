import {
  BellRing,
  Box,
  Compass,
  Layers,
  LayoutGrid,
  PanelsTopLeft,
  Shapes,
  Sparkles,
  Table2,
  TextCursorInput,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * How each registry category is presented: an icon, and one line on what is
 * in it.
 *
 * The labels stay in `registry.ts`, next to the reading order they belong to.
 * This is only the decoration, kept apart so a client component can import it
 * without pulling in the file system reads the registry module does.
 */
export interface CategoryMeta {
  icon: LucideIcon;
  blurb: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  foundation: {
    icon: Box,
    blurb: "The primitives everything else is assembled from.",
  },
  form: {
    icon: TextCursorInput,
    blurb: "Inputs, pickers and controls that validate, announce and hold their state.",
  },
  overlay: {
    icon: Layers,
    blurb: "Dialogs, sheets and popovers that trap focus and give it back.",
  },
  navigation: {
    icon: Compass,
    blurb: "Ways around an application — from a breadcrumb to a magnifying dock.",
  },
  display: {
    icon: LayoutGrid,
    blurb: "Cards, carousels and stacks for presenting things worth looking at.",
  },
  data: {
    icon: Table2,
    blurb: "Tables, diffs, logs and dithered charts for dense information.",
  },
  feedback: {
    icon: BellRing,
    blurb: "Loaders, toasts and status that say what is happening, and to whom.",
  },
  layout: {
    icon: PanelsTopLeft,
    blurb: "Structure between the parts.",
  },
  ai: {
    icon: Sparkles,
    blurb: "Streaming, reasoning, tool calls and approvals — the parts every AI product needs.",
  },
  effects: {
    icon: WandSparkles,
    blurb: "Text, cursor and shader effects, with reduced motion handled for you.",
  },
};

// A category the registry gains before this file hears of it still gets an
// icon, rather than a hole where one should be.
const FALLBACK_META: CategoryMeta = { icon: Shapes, blurb: "" };

export function categoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? FALLBACK_META;
}
