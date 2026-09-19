import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SocialSelector, type SocialPlatform } from "./social-selector";

const PLATFORMS: SocialPlatform[] = [
  {
    value: "x",
    name: "X",
    icon: <svg data-testid="x-icon" />,
    domain: "x.com",
    url: "https://x.com/dowel",
  },
  {
    value: "bluesky",
    name: "Bluesky",
    icon: <svg />,
    domain: "bsky.app",
    url: "https://bsky.app/profile/dowel",
  },
  { value: "threads", name: "Threads", icon: <svg /> },
];

function indicator(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-slot="social-selector-indicator"]');
}

describe("SocialSelector", () => {
  it("renders a named radio group with one radio per platform", () => {
    render(<SocialSelector platforms={PLATFORMS} label="Follow on" />);
    const group = screen.getByRole("radiogroup", { name: "Follow on" });
    expect(group).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-label"))).toEqual([
      "X",
      "Bluesky",
      "Threads",
    ]);
    expect(screen.getByRole("radio", { name: "X" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("x-icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it("shows the selected domain and handle as links that say they open a new tab", () => {
    render(<SocialSelector platforms={PLATFORMS} handle="dowel" />);
    const domain = screen.getByRole("link", { name: /^x\.com\s*\(opens in a new tab\)$/ });
    expect(domain).toHaveAttribute("href", "https://x.com/dowel");
    expect(domain).toHaveAttribute("target", "_blank");
    expect(domain).toHaveAttribute("rel", "noopener noreferrer");
    expect(
      screen.getByRole("link", { name: /^@dowel\s*\(opens in a new tab\)$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Updates on/)).toBeInTheDocument();
  });

  it("selects on click and slides the pill", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <SocialSelector platforms={PLATFORMS} onValueChange={onValueChange} handle="dowel" />,
    );
    expect(indicator(container)?.style.getPropertyValue("--social-index")).toBe("0");

    await user.click(screen.getByRole("radio", { name: "Bluesky" }));
    expect(onValueChange).toHaveBeenCalledWith("bluesky");
    expect(screen.getByRole("radio", { name: "Bluesky" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(indicator(container)?.style.getPropertyValue("--social-index")).toBe("1");
    expect(screen.getByRole("link", { name: /bsky\.app/ })).toBeInTheDocument();
  });

  it("falls back to plain text when a platform has no URL", async () => {
    const user = userEvent.setup();
    render(<SocialSelector platforms={PLATFORMS} handle="dowel" />);
    await user.click(screen.getByRole("radio", { name: "Threads" }));
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Threads")).toHaveAttribute("data-slot", "social-selector-domain");
    expect(screen.getByText("@dowel")).toBeInTheDocument();
  });

  // Selection-on-arrow is Radix's own behaviour and is not observable under
  // jsdom (see radio-group.test.tsx); movement and Space selection are.
  it("moves with the arrow keys and selects with Space", async () => {
    const user = userEvent.setup();
    render(<SocialSelector platforms={PLATFORMS} />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "X" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Bluesky" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "Bluesky" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("follows the reading direction for arrow keys", async () => {
    const user = userEvent.setup();
    render(<SocialSelector platforms={PLATFORMS} dir="rtl" />);
    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Bluesky" })).toHaveFocus();
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("threads");
      return (
        <>
          <SocialSelector platforms={PLATFORMS} value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("radio", { name: "Threads" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(screen.getByRole("radio", { name: "X" }));
    expect(screen.getByRole("status")).toHaveTextContent("x");
  });

  it("stays on the prop value when controlled and not updated", async () => {
    const user = userEvent.setup();
    render(<SocialSelector platforms={PLATFORMS} value="x" />);
    await user.click(screen.getByRole("radio", { name: "Threads" }));
    expect(screen.getByRole("radio", { name: "X" })).toHaveAttribute("aria-checked", "true");
  });

  it("honours defaultValue, same-tab links and a hidden caption", () => {
    const { rerender } = render(
      <SocialSelector
        platforms={PLATFORMS}
        defaultValue="bluesky"
        openInNewTab={false}
        handle="d"
      />,
    );
    const link = screen.getByRole("link", { name: "bsky.app" });
    expect(link).not.toHaveAttribute("target");
    rerender(
      <SocialSelector platforms={PLATFORMS} defaultValue="bluesky" showCaption={false} />,
    );
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders no pill or caption when nothing matches", () => {
    const { container } = render(<SocialSelector platforms={PLATFORMS} value="mastodon" />);
    expect(indicator(container)).toBeNull();
    expect(container.querySelector('[data-slot="social-selector-caption"]')).toBeNull();
    render(<SocialSelector platforms={[]} />);
  });

  it("submits with a form and can be disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(
      <form>
        <SocialSelector
          platforms={PLATFORMS}
          name="platform"
          disabled
          onValueChange={onValueChange}
        />
      </form>,
    );
    await user.click(screen.getByRole("radio", { name: "Bluesky" }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "X" })).toBeDisabled();
    expect(container.querySelector("form")).toBeInTheDocument();
  });

  it("applies the size variant, merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SocialSelector
        ref={ref}
        platforms={PLATFORMS}
        size="lg"
        className="gap-2"
        data-testid="root"
      />,
    );
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("gap-2", "[--social-size:2.75rem]");
    expect(root).not.toHaveClass("gap-6");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<SocialSelector platforms={PLATFORMS} handle="dowel" />);
    await expectNoA11yViolations(container);
  });
});
