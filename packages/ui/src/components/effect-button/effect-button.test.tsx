import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArrowRight, Heart, Settings, Trash2 } from "lucide-react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { EffectButton, effectButtonEffects } from "./effect-button";

function part(container: HTMLElement, name: string) {
  return container.querySelector<HTMLElement>(`[data-slot="effect-button-${name}"]`);
}

function stylesheet() {
  return [...document.querySelectorAll("style")].map((node) => node.textContent).join("\n");
}

describe("EffectButton", () => {
  it("renders a button named by its label", () => {
    render(<EffectButton icon={<Settings />}>Settings</EffectButton>);
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute(
      "data-slot",
      "effect-button",
    );
  });

  it("defaults to the slide-arrow effect", () => {
    render(<EffectButton>Go</EffectButton>);
    expect(screen.getByRole("button")).toHaveAttribute("data-effect", "slide-arrow");
  });

  it.each(effectButtonEffects)("renders the %s effect", (effect) => {
    render(
      <EffectButton effect={effect} icon={<Heart />} trailingIcon={<ArrowRight />}>
        Action
      </EffectButton>,
    );
    const button = screen.getByRole("button", { name: "Action" });
    expect(button).toHaveAttribute("data-effect", effect);
    expect(button).toHaveClass("group/effect", "relative");
  });

  it.each(effectButtonEffects)(
    "triggers every %s transition on keyboard focus as well as hover",
    (effect) => {
      const { container } = render(
        <EffectButton
          effect={effect}
          icon={<Heart />}
          trailingIcon={<ArrowRight />}
          tone="info"
        >
          Action
        </EffectButton>,
      );
      const classes = [...container.querySelectorAll<HTMLElement>("[class]")].flatMap(
        (node) => [...node.classList],
      );
      const hover = classes.filter((name) => name.startsWith("group-hover/effect:"));
      for (const name of hover) {
        expect(classes).toContain(
          name.replace("group-hover/effect:", "group-focus-visible/effect:"),
        );
      }
    },
  );

  it("keys every keyframed rule to focus-visible as well as hover", () => {
    render(<EffectButton effect="glare">Shine</EffectButton>);
    const css = stylesheet();
    const hovered = [...css.matchAll(/\[data-effect=([\w-]+)\]:hover/g)].map(
      (match) => match[1],
    );
    expect(hovered.length).toBeGreaterThan(0);
    for (const effect of hovered) {
      expect(css).toContain(`[data-effect=${String(effect)}]:focus-visible`);
    }
  });

  it("defines every keyframe it references", () => {
    render(<EffectButton effect="pulse">Sponsor</EffectButton>);
    const css = stylesheet();
    const used = new Set(
      [...css.matchAll(/animation:(dowel-effect-button-[\w-]+)/g)].map((match) => match[1]),
    );
    expect(used.size).toBe(4);
    for (const name of used) {
      expect(css).toContain(`@keyframes ${String(name)}{`);
    }
  });

  it("is decoration: durations use --motion-scale, never the indicator scale", () => {
    const { container } = render(<EffectButton effect="shake">Delete</EffectButton>);
    const css = stylesheet();
    expect(css).toContain("var(--motion-scale, 1)");
    expect(css).not.toContain("--motion-scale-indicator");
    expect(container.querySelector("[data-motion]")).toBeNull();
  });

  describe("slide-arrow", () => {
    it("renders the leading and trailing icons as decoration", () => {
      const { container } = render(
        <EffectButton icon={<Heart />} trailingIcon={<ArrowRight />}>
          Download for Mac
        </EffectButton>,
      );
      expect(part(container, "icon")).toHaveAttribute("aria-hidden", "true");
      expect(part(container, "trailing-icon")).toHaveAttribute("aria-hidden", "true");
      expect(part(container, "icon")).toHaveClass("group-hover/effect:opacity-0");
      expect(part(container, "trailing-icon")).toHaveClass("opacity-0");
    });

    it("mirrors the arrow in right-to-left layouts", () => {
      const { container } = render(
        <EffectButton icon={<Heart />} trailingIcon={<ArrowRight />}>
          Next
        </EffectButton>,
      );
      expect(part(container, "trailing-icon")?.firstElementChild).toHaveClass(
        "rtl:-scale-x-100",
      );
    });

    it("ignores trailingIcon for the other effects", () => {
      const { container } = render(
        <EffectButton effect="rotate" trailingIcon={<ArrowRight />}>
          Reload
        </EffectButton>,
      );
      expect(part(container, "trailing-icon")).toBeNull();
    });
  });

  describe("tone", () => {
    it("colours the pulsing icon but not the label", () => {
      const { container } = render(
        <EffectButton effect="pulse" icon={<Heart />} tone="destructive">
          Sponsor
        </EffectButton>,
      );
      expect(part(container, "icon")).toHaveClass(
        "group-hover/effect:text-destructive",
        "group-hover/effect:[&_svg]:fill-current",
      );
      expect(part(container, "label")).not.toHaveClass("group-hover/effect:text-destructive");
    });

    it("colours the shaking icon and its label", () => {
      const { container } = render(
        <EffectButton effect="shake" icon={<Trash2 />} tone="destructive">
          Delete
        </EffectButton>,
      );
      expect(part(container, "icon")).toHaveClass(
        "group-focus-visible/effect:text-destructive",
      );
      expect(part(container, "label")).toHaveClass(
        "group-focus-visible/effect:text-destructive",
      );
    });

    it.each(["primary", "success", "warning", "info"] as const)(
      "maps %s to its semantic colour",
      (tone) => {
        const { container } = render(
          <EffectButton effect="shake" icon={<Trash2 />} tone={tone}>
            Delete
          </EffectButton>,
        );
        expect(part(container, "icon")).toHaveClass(`group-hover/effect:text-${tone}`);
      },
    );

    it("has no effect on effects that are not toned", () => {
      const { container } = render(
        <EffectButton effect="rotate" icon={<Settings />} tone="destructive">
          Settings
        </EffectButton>,
      );
      expect(part(container, "icon")?.className).not.toContain("text-destructive");
    });
  });

  it("rotates the icon for rotate and text-reveal", () => {
    const { container } = render(
      <>
        <EffectButton effect="rotate" icon={<Settings />}>
          Settings
        </EffectButton>
        <EffectButton effect="text-reveal" icon={<ArrowRight />}>
          Text Reveal
        </EffectButton>
      </>,
    );
    const [rotate, reveal] = container.querySelectorAll('[data-slot="effect-button-icon"]');
    expect(rotate).toHaveClass("group-hover/effect:rotate-180");
    expect(reveal).toHaveClass("group-hover/effect:rotate-45");
  });

  it("reveals a duplicate label that is hidden from the accessible name", () => {
    const { container } = render(<EffectButton effect="text-reveal">Text Reveal</EffectButton>);
    expect(screen.getByRole("button", { name: "Text Reveal" })).toBeInTheDocument();
    const copies = part(container, "label")?.children;
    expect(copies).toHaveLength(2);
    expect(copies?.[1]).toHaveAttribute("aria-hidden", "true");
  });

  it("sweeps glare with a currentColor gradient inside a clipped surface", () => {
    const { container } = render(<EffectButton effect="glare">Glare Shine</EffectButton>);
    expect(screen.getByRole("button")).toHaveClass("overflow-hidden");
    const glare = part(container, "glare");
    expect(glare).toHaveAttribute("aria-hidden", "true");
    expect(glare?.className).toContain("color-mix(in_oklab,currentColor_22%,transparent)");
    expect(glare).toHaveClass("-translate-x-full");
  });

  it("renders a resting, invisible ring for expand-ring", () => {
    const { container } = render(<EffectButton effect="expand-ring">Expand Ring</EffectButton>);
    expect(part(container, "ring")).toHaveClass("opacity-0", "rounded-[inherit]");
  });

  it("renders four logical corners for clip-corners that move inward", () => {
    const { container } = render(<EffectButton effect="clip-corners">Clip</EffectButton>);
    const corners = container.querySelectorAll('[data-slot="effect-button-corner"]');
    expect([...corners].map((corner) => corner.getAttribute("data-corner"))).toEqual([
      "top-start",
      "top-end",
      "bottom-start",
      "bottom-end",
    ]);
    expect(corners[0]).toHaveClass(
      "start-1.5",
      "group-hover/effect:start-2.5",
      "rtl:-scale-x-100",
    );
  });

  it("omits the label wrapper for an icon-only button", () => {
    const { container } = render(
      <EffectButton effect="rotate" size="icon" icon={<Settings />} aria-label="Settings" />,
    );
    expect(part(container, "label")).toBeNull();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("passes Button's variant and size through", () => {
    render(
      <EffectButton variant="outline" size="lg">
        Outline
      </EffectButton>,
    );
    expect(screen.getByRole("button")).toHaveClass("border-input", "h-10");
  });

  it("lets a consumer className override a conflicting utility", () => {
    render(
      <EffectButton effect="glare" className="overflow-visible rounded-full">
        Shine
      </EffectButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveClass("overflow-visible", "rounded-full");
    expect(button).not.toHaveClass("overflow-hidden");
    expect(button).not.toHaveClass("rounded-md");
  });

  it("forwards a ref and arbitrary props", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <EffectButton ref={ref} type="submit" data-testid="effect">
        Save
      </EffectButton>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(screen.getByTestId("effect")).toHaveAttribute("type", "submit");
  });

  it("activates from a pointer, Enter and Space", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <EffectButton effect="pulse" icon={<Heart />} onClick={onClick}>
        Sponsor
      </EffectButton>,
    );
    await user.click(screen.getByRole("button"));
    await user.tab();
    await user.tab({ shift: true });
    expect(screen.getByRole("button")).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("is blocked when disabled", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <EffectButton disabled onClick={onClick}>
        Delete
      </EffectButton>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("replaces its leading icon with Button's spinner while loading", () => {
    const { container } = render(
      <EffectButton loading icon={<Heart />}>
        Saving
      </EffectButton>,
    );
    expect(screen.getByRole("button", { name: "Saving" })).toHaveAttribute("aria-busy", "true");
    expect(part(container, "icon")).toBeNull();
  });

  it("renders its parts inside the child element with asChild", () => {
    const { container } = render(
      <EffectButton asChild effect="slide-arrow" icon={<Heart />} trailingIcon={<ArrowRight />}>
        <a href="/download">Download</a>
      </EffectButton>,
    );
    const link = screen.getByRole("link", { name: "Download" });
    expect(link).toHaveAttribute("href", "/download");
    expect(link).toHaveAttribute("data-effect", "slide-arrow");
    expect(link).toContainElement(part(container, "trailing-icon"));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        {effectButtonEffects.map((effect) => (
          <EffectButton
            key={effect}
            effect={effect}
            icon={<Heart />}
            trailingIcon={<ArrowRight />}
            tone="destructive"
          >
            {effect}
          </EffectButton>
        ))}
        <EffectButton effect="rotate" size="icon" icon={<Settings />} aria-label="Settings" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
