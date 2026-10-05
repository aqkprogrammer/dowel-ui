import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { PreviewLinkCard, previewLinkCardVariants } from "./preview-link-card";

const HREF = "https://www.example.com/docs/motion";
const IMAGE = "/previews/motion.png";

function card() {
  return document.querySelector<HTMLElement>("[data-slot=hover-card-content]");
}

function slot(name: string) {
  return document.querySelector<HTMLElement>(`[data-slot=preview-link-card-${name}]`);
}

describe("PreviewLinkCard", () => {
  it("is a normal link that opens a preview card on hover", async () => {
    const user = userEvent.setup();
    render(
      <PreviewLinkCard href={HREF} image={IMAGE} heading="Motion" openDelay={0} closeDelay={0}>
        the motion guide
      </PreviewLinkCard>,
    );
    const link = screen.getByRole("link", { name: "the motion guide" });
    expect(link).toHaveAttribute("href", HREF);
    expect(link).toHaveAttribute("data-slot", "preview-link-card");
    expect(card()).toBeNull();

    await user.hover(link);
    await waitFor(() => {
      expect(card()).not.toBeNull();
    });
    expect(slot("content")).not.toBeNull();

    await user.unhover(link);
    await waitFor(() => {
      expect(card()).toBeNull();
    });
  });

  it("opens on keyboard focus, as hovering does", async () => {
    const user = userEvent.setup();
    render(
      <PreviewLinkCard href={HREF} image={IMAGE} openDelay={0}>
        guide
      </PreviewLinkCard>,
    );
    await user.tab();
    expect(screen.getByRole("link")).toHaveFocus();
    await waitFor(() => {
      expect(card()).not.toBeNull();
    });
  });

  it("shows the heading, description and hostname without www", () => {
    render(
      <PreviewLinkCard
        href={HREF}
        image={IMAGE}
        heading="Motion"
        description="How Dowel moves."
        defaultOpen
      >
        guide
      </PreviewLinkCard>,
    );
    const text = slot("text");
    expect(text).toHaveTextContent("Motion");
    expect(text).toHaveTextContent("How Dowel moves.");
    expect(slot("host")).toHaveTextContent("example.com");
    expect(text?.children).toHaveLength(3);
  });

  it("omits the hostname for a relative href, and the text block when there is nothing to say", () => {
    render(
      <PreviewLinkCard href="/docs" image={IMAGE} defaultOpen>
        docs
      </PreviewLinkCard>,
    );
    expect(slot("host")).toBeNull();
    expect(slot("text")).toBeNull();
  });

  it("holds a shimmer until the image loads, then reveals it", () => {
    render(
      <PreviewLinkCard href={HREF} image={IMAGE} defaultOpen>
        guide
      </PreviewLinkCard>,
    );
    const image = slot("image");
    expect(image).toHaveAttribute("src", IMAGE);
    expect(image).toHaveAttribute("alt", "");
    expect(image).not.toHaveAttribute("data-loaded");
    expect(image).toHaveClass("opacity-0");
    expect(slot("shimmer")).toHaveAttribute("aria-hidden", "true");

    fireEvent.load(image as HTMLElement);
    expect(slot("image")).toHaveAttribute("data-loaded", "");
    expect(slot("image")).not.toHaveClass("opacity-0");
    expect(slot("shimmer")).toBeNull();
  });

  it("falls back to the hostname when the image fails", () => {
    render(
      <PreviewLinkCard href={HREF} image={IMAGE} imageAlt="The motion guide" defaultOpen>
        guide
      </PreviewLinkCard>,
    );
    expect(screen.getByRole("img", { name: "The motion guide" })).toBeInTheDocument();
    fireEvent.error(slot("image") as HTMLElement);
    expect(slot("image")).toBeNull();
    expect(slot("shimmer")).toBeNull();
    expect(slot("media")).toHaveTextContent("example.com");
  });

  it("treats an image that is already complete as loaded", () => {
    const complete = vi
      .spyOn(HTMLImageElement.prototype, "complete", "get")
      .mockReturnValue(true);
    const width = vi
      .spyOn(HTMLImageElement.prototype, "naturalWidth", "get")
      .mockReturnValue(640);
    render(
      <PreviewLinkCard href={HREF} image={IMAGE} defaultOpen>
        guide
      </PreviewLinkCard>,
    );
    expect(slot("image")).toHaveAttribute("data-loaded", "");
    complete.mockRestore();
    width.mockRestore();
  });

  it.each([
    ["sm", "w-60"],
    ["md", "w-72"],
    ["lg", "w-80"],
  ] as const)("applies the %s size to the card", (size, width) => {
    render(
      <PreviewLinkCard href={HREF} image={IMAGE} size={size} defaultOpen>
        guide
      </PreviewLinkCard>,
    );
    expect(card()).toHaveClass(width, "p-0");
    expect(previewLinkCardVariants({ size })).toContain(width);
  });

  it("works as a controlled component", async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Preview
          </button>
          <PreviewLinkCard
            href={HREF}
            image={IMAGE}
            open={open}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          >
            guide
          </PreviewLinkCard>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(card()).not.toBeNull();
  });

  it("lets consumer classNames win and forwards ref and props", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <PreviewLinkCard
        ref={ref}
        href={HREF}
        image={IMAGE}
        className="text-foreground"
        cardClassName="w-96"
        target="_blank"
        rel="noreferrer"
        defaultOpen
      >
        guide
      </PreviewLinkCard>,
    );
    const link = screen.getByRole("link");
    expect(ref.current).toBe(link);
    expect(link).toHaveClass("text-foreground");
    expect(link).not.toHaveClass("text-primary");
    expect(link).toHaveAttribute("target", "_blank");
    expect(card()).toHaveClass("w-96");
    expect(card()).not.toHaveClass("w-72");
  });

  it("has no accessibility violations while open", async () => {
    const { baseElement } = render(
      <p>
        Read{" "}
        <PreviewLinkCard
          href={HREF}
          image={IMAGE}
          heading="Motion"
          description="How Dowel moves."
          defaultOpen
        >
          the motion guide
        </PreviewLinkCard>
        .
      </p>,
    );
    await expectNoA11yViolations(baseElement);
  });
});
