"use client";

import { THEME_PRESETS } from "@dowel/themes";
import { Button } from "@dowel/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@dowel/ui/dropdown-menu";
import { Monitor, Moon, Palette, Sun } from "lucide-react";

import { useTheme } from "./theme-provider";

const MODE_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeControls() {
  const { mode, setMode, preset, setPreset, resolvedDark } = useTheme();
  const ModeIcon = MODE_ICON[mode];

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        // The name says what pressing it does, not what the state currently is.
        aria-label={resolvedDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => {
          setMode(resolvedDark ? "light" : "dark");
        }}
      >
        <ModeIcon />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Change theme">
            <Palette />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Colour mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) => {
              setMode(value as typeof mode);
            }}
          >
            <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preset}
            onValueChange={(value) => {
              setPreset(value as typeof preset);
            }}
          >
            {THEME_PRESETS.map((name) => (
              <DropdownMenuRadioItem key={name} value={name} className="capitalize">
                {name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
