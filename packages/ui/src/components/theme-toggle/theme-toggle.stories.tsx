import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ThemeToggle, type ThemeToggleTheme } from "./theme-toggle";

const meta = {
  title: "Form/Theme Toggle",
  component: ThemeToggle,
  args: { variant: "icon", size: "md", disabled: false },
  argTypes: {
    variant: { control: "inline-radio", options: ["icon", "switch"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    theme: { control: false },
  },
  parameters: { layout: "centered" },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The knob carries the sun across the track and eclipses it on the way. */
export const Switch: Story = {
  args: { variant: "switch" },
};

/** Every variant at every size, side by side. */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-3 items-center justify-items-center gap-6">
      {(["sm", "md", "lg"] as const).map((size) => (
        <ThemeToggle key={`icon-${size}`} size={size} />
      ))}
      {(["sm", "md", "lg"] as const).map((size) => (
        <ThemeToggle key={`switch-${size}`} variant="switch" size={size} />
      ))}
    </div>
  ),
};

/**
 * Wired to a surface. The toggle never touches the document: it reports the
 * theme, and this story scopes the `dark` class to the panel below. In an app
 * you would set it on `<html>` and persist the choice.
 */
export const Wired: Story = {
  parameters: { controls: { disable: true } },
  render: function Render() {
    const [theme, setTheme] = useState<ThemeToggleTheme>("light");
    return (
      <div
        className={`${theme === "dark" ? "dark" : ""} w-72 rounded-xl border border-border bg-background p-4 text-foreground transition-colors duration-[var(--duration-normal)]`}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" id="wired-label">
            Dark mode
          </span>
          <ThemeToggle
            variant="switch"
            theme={theme}
            onThemeChange={setTheme}
            aria-labelledby="wired-label"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          This panel is in the {theme} theme.
        </p>
      </div>
    );
  },
};

export const StartsDark: Story = {
  args: { defaultTheme: "dark" },
};

export const Disabled: Story = {
  args: { disabled: true },
};
