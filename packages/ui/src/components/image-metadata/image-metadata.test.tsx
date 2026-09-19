import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ImageMetadata, type ImageMetadataField } from "./image-metadata";

const FIELDS: ImageMetadataField[] = [
  { label: "Created", value: "2024-01-15" },
  { label: "Updated", value: "2024-01-20" },
  { label: "By", value: "John Doe" },
  { label: "Source", value: "https://example.com/source" },
];

const base = {
  src: "/canyon.jpg",
  alt: "A desert canyon",
  filename: "desert-canyon.jpg",
  description: "Snow-capped peaks",
  metadata: FIELDS,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ImageMetadata", () => {
  it("renders the image, actions and a collapsed details toggle", () => {
    render(<ImageMetadata {...base} actions={<button type="button">Share</button>} />);
    expect(screen.getByRole("img", { name: "A desert canyon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Show details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    const panel = document.getElementById(toggle.getAttribute("aria-controls") ?? "");
    expect(panel).toHaveAttribute("inert");
    expect(panel).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("opens the panel, moves focus into it and closes back to the toggle", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ImageMetadata {...base} onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Show details" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    const region = screen.getByRole("region", { name: "desert-canyon.jpg" });
    expect(region).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveFocus();
    expect(screen.getByText("Created").tagName).toBe("DT");
    expect(screen.getByText("John Doe").tagName).toBe("DD");
    expect(screen.getByText("Snow-capped peaks")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show details", hidden: true })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Hide details" }));
    expect(screen.getByRole("button", { name: "Show details" })).toHaveFocus();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("closes on Escape from the keyboard", async () => {
    const user = userEvent.setup();
    render(<ImageMetadata {...base} />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveFocus();
    await user.keyboard("a");
    expect(screen.getByRole("region")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getByRole("button", { name: "Show details" })).toHaveFocus();
  });

  it("lifts the image by the panel's extra height", () => {
    const observers: ResizeObserverCallback[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          observers.push(callback);
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.dataset.slot === "image-metadata-panel" ? 200 : 44;
    });
    const { container, unmount } = render(<ImageMetadata {...base} defaultOpen />);
    const image = container.querySelector<HTMLElement>('[data-slot="image-metadata-image"]');
    expect(image?.style.translate).toBe("0 -156px");
    expect(observers).toHaveLength(1);
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <ImageMetadata {...base} open={open} onOpenChange={setOpen} />
          <output>{String(open)}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("region")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hide details" }));
    expect(screen.getByRole("status")).toHaveTextContent("false");
  });

  it("takes custom labels and merges className, shape and ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ImageMetadata
        {...base}
        ref={ref}
        shape="square"
        openLabel="Info"
        closeLabel="Close info"
        className="gap-2"
        imageClassName="aspect-square"
        data-testid="root"
      />,
    );
    const root = screen.getByTestId("root");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("gap-2", "[--image-metadata-radius:0.5rem]");
    expect(root).not.toHaveClass("gap-4");
    expect(screen.getByRole("button", { name: "Info" })).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveClass("aspect-square");
  });

  it("has no accessibility violations open or closed", async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageMetadata {...base} />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Show details" }));
    await expectNoA11yViolations(container);
  });
});
