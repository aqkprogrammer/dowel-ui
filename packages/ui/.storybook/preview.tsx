import { COLOR_MODES, THEME_PRESETS } from "@dowel-ui/themes";
import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect, type ReactNode } from "react";

import { DirectionProvider } from "../src/components/direction";

import "./preview.css";

/**
 * Applies the toolbar's colour mode and theme preset to the document root, the
 * same way a real app's theme provider would. Every story therefore renders
 * against the real cascade rather than a story-local approximation.
 */
function ThemeFrame({
  colorMode,
  themePreset,
  direction,
  children,
}: {
  colorMode: string;
  themePreset: string;
  direction: "ltr" | "rtl";
  children: ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", colorMode === "dark");

    if (themePreset === "default") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themePreset);
    }

    root.setAttribute("dir", direction);
  }, [colorMode, themePreset, direction]);

  // Both halves of what an RTL application does (see DirectionProvider): `dir`
  // on the document for the logical CSS, and the provider for the primitives
  // that read direction from context. With only the first, menus and selects
  // stay left-to-right and the story shows a bug no real app would have.
  return <DirectionProvider dir={direction}>{children}</DirectionProvider>;
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame
    colorMode={context.globals.colorMode as string}
    themePreset={context.globals.themePreset as string}
    direction={context.globals.direction === "rtl" ? "rtl" : "ltr"}
  >
    <Story />
  </ThemeFrame>
);

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: {
    colorMode: "light",
    themePreset: "default",
    direction: "ltr",
  },
  globalTypes: {
    colorMode: {
      description: "Colour mode",
      toolbar: {
        title: "Mode",
        icon: "contrast",
        items: COLOR_MODES.filter((mode) => mode !== "system"),
        dynamicTitle: true,
      },
    },
    themePreset: {
      description: "Theme preset",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [...THEME_PRESETS],
        dynamicTitle: true,
      },
    },
    // Also what the visual regression suite sets (`globals=direction:rtl`), so
    // an RTL screenshot is the story a person sees from this toolbar.
    direction: {
      description: "Writing direction",
      toolbar: {
        title: "Direction",
        icon: "transfer",
        items: ["ltr", "rtl"],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: { expanded: true },
    // Accessibility findings fail the story rather than sitting in a panel
    // nobody opens.
    a11y: { test: "error" },
  },
};

export default preview;
