import { COLOR_MODES, THEME_PRESETS } from "@dowel-ui/themes";
import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect, type ReactNode } from "react";

import "./preview.css";

/**
 * Applies the toolbar's colour mode and theme preset to the document root, the
 * same way a real app's theme provider would. Every story therefore renders
 * against the real cascade rather than a story-local approximation.
 */
function ThemeFrame({
  colorMode,
  themePreset,
  children,
}: {
  colorMode: string;
  themePreset: string;
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
  }, [colorMode, themePreset]);

  return children;
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame
    colorMode={context.globals.colorMode as string}
    themePreset={context.globals.themePreset as string}
  >
    <Story />
  </ThemeFrame>
);

const preview: Preview = {
  decorators: [withTheme],
  initialGlobals: {
    colorMode: "light",
    themePreset: "default",
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
