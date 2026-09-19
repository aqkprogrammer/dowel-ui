import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { DirectionProvider } from "@/components/direction";
import { createRef, useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { flickedAway, PhotoStack, type PhotoStackPhoto } from "./photo-stack";

const PHOTOS: PhotoStackPhoto[] = [
  {
    id: "canyon",
    src: "/1.jpg",
    alt: "Desert canyon at sunset",
    name: "Desert Canyon",
    subtitle: "Golden hour",
  },
  { id: "palms", src: "/2.jpg", alt: "Palm grove in soft light", name: "Palm Grove" },
  { id: "lights", src: "/3.jpg", alt: "City lights bokeh at night" },
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});
afterEach(() => {
  vi.restoreAllMocks();
});

function top() {
  return screen.getByRole("group", { name: /of 3$/ });
}

function mockReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("reduce"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

describe("PhotoStack", () => {
  it("is a labelled carousel exposing only the top photo", () => {
    render(<PhotoStack photos={PHOTOS} />);
    expect(screen.getByRole("region", { name: "Photos" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    );
    expect(top()).toHaveAccessibleName("Desert Canyon, 1 of 3");
    expect(top()).toHaveAttribute("aria-roledescription", "slide");
    const hidden = document.querySelectorAll(
      '[data-slot="photo-stack-photo"][aria-hidden="true"]',
    );
    expect(hidden).toHaveLength(2);
    expect(hidden[0]).toHaveAttribute("inert");
    expect(screen.getByText("Golden hour")).toBeInTheDocument();
  });

  it("sends the top photo to the back when its button is pressed, and announces the next", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<PhotoStack photos={PHOTOS} onIndexChange={onIndexChange} />);
    await user.click(screen.getByRole("button", { name: "Show next photo" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
    expect(top()).toHaveAccessibleName("Palm Grove, 2 of 3");
    expect(screen.getByRole("status")).toHaveTextContent("Palm Grove, 2 of 3");
    await user.click(screen.getByRole("button", { name: "Show next photo" }));
    // No name: the alt text names it.
    expect(top()).toHaveAccessibleName("City lights bokeh at night, 3 of 3");
    await user.click(screen.getByRole("button", { name: "Show next photo" }));
    expect(top()).toHaveAccessibleName("Desert Canyon, 1 of 3");
  });

  it("cycles from the keyboard: Enter and Space on the photo, arrows either way", async () => {
    const user = userEvent.setup();
    render(<PhotoStack photos={PHOTOS} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Show next photo" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(top()).toHaveAccessibleName("Palm Grove, 2 of 3");
    await user.keyboard(" ");
    expect(top()).toHaveAccessibleName("City lights bokeh at night, 3 of 3");

    const region = screen.getByRole("button", { name: "Show next photo" });
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(top()).toHaveAccessibleName("Palm Grove, 2 of 3");
    fireEvent.keyDown(screen.getByRole("button", { name: "Show next photo" }), {
      key: "ArrowRight",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Show next photo" }), {
      key: "ArrowDown",
    });
    expect(top()).toHaveAccessibleName("Desert Canyon, 1 of 3");
    fireEvent.keyDown(screen.getByRole("button", { name: "Show next photo" }), {
      key: "ArrowUp",
    });
    expect(top()).toHaveAccessibleName("City lights bokeh at night, 3 of 3");
    fireEvent.keyDown(screen.getByRole("button", { name: "Show next photo" }), { key: "Tab" });
    expect(top()).toHaveAccessibleName("City lights bokeh at night, 3 of 3");
  });

  it("mirrors the horizontal arrows in right-to-left layouts", () => {
    render(
      <div dir="rtl">
        <PhotoStack photos={PHOTOS} />
      </div>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Show next photo" }), {
      key: "ArrowLeft",
    });
    expect(top()).toHaveAccessibleName("Palm Grove, 2 of 3");
  });

  it("reads direction from the DirectionProvider too", () => {
    render(
      <DirectionProvider dir="rtl">
        <PhotoStack photos={PHOTOS} />
      </DirectionProvider>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Show next photo" }), {
      key: "ArrowRight",
    });
    expect(top()).toHaveAccessibleName("City lights bokeh at night, 3 of 3");
  });

  it("offers previous and next buttons with controls", async () => {
    const user = userEvent.setup();
    render(<PhotoStack photos={PHOTOS} controls />);
    await user.click(screen.getByRole("button", { name: "Previous photo" }));
    expect(top()).toHaveAccessibleName("City lights bokeh at night, 3 of 3");
    await user.click(screen.getByRole("button", { name: "Next photo" }));
    expect(top()).toHaveAccessibleName("Desert Canyon, 1 of 3");
    fireEvent.keyDown(screen.getByRole("button", { name: "Next photo" }), {
      key: "ArrowRight",
    });
    expect(top()).toHaveAccessibleName("Palm Grove, 2 of 3");
  });

  it("follows a controlled index and starts from defaultIndex", async () => {
    function Controlled() {
      const [index, setIndex] = useState(2);
      return <PhotoStack photos={PHOTOS} index={index} onIndexChange={setIndex} />;
    }
    const user = userEvent.setup();
    const { unmount } = render(<Controlled />);
    expect(top()).toHaveAccessibleName("City lights bokeh at night, 3 of 3");
    await user.click(screen.getByRole("button", { name: "Show next photo" }));
    expect(top()).toHaveAccessibleName("Desert Canyon, 1 of 3");
    unmount();

    render(<PhotoStack photos={PHOTOS} defaultIndex={1} />);
    expect(top()).toHaveAccessibleName("Palm Grove, 2 of 3");
  });

  it("does nothing with fewer than two photos", async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<PhotoStack photos={PHOTOS.slice(0, 1)} onIndexChange={onIndexChange} />);
    await user.click(screen.getByRole("button", { name: "Show next photo" }));
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it("decides a flick by distance or speed", () => {
    expect(flickedAway({ offset: { x: 120, y: 0 }, velocity: { x: 0, y: 0 } })).toBe(true);
    expect(flickedAway({ offset: { x: -10, y: 0 }, velocity: { x: -900, y: 0 } })).toBe(true);
    expect(flickedAway({ offset: { x: 30, y: 0 }, velocity: { x: 100, y: 0 } })).toBe(false);
  });

  // Motion processes pointer moves on animation frames, so the drag needs
  // real time between events.
  const frame = () => act(() => new Promise((resolve) => setTimeout(resolve, 30)));
  const pointer = { isPrimary: true, button: 0, pointerId: 1, pointerType: "mouse" };

  async function drag(element: HTMLElement, to: number) {
    fireEvent.pointerDown(element, { ...pointer, clientX: 0, clientY: 0 });
    await frame();
    fireEvent.pointerMove(element, { ...pointer, clientX: to / 3, clientY: 0 });
    await frame();
    fireEvent.pointerMove(element, { ...pointer, clientX: to, clientY: 0 });
    await frame();
    fireEvent.pointerUp(element, { ...pointer, clientX: to, clientY: 0 });
  }

  it("sends the photo back when flicked away, without the trailing click cycling twice", async () => {
    render(<PhotoStack photos={PHOTOS} />);
    await drag(top(), 200);
    // The click a real drag leaves behind is swallowed.
    fireEvent.click(screen.getByRole("button", { name: "Show next photo" }));
    await frame();
    expect(top()).toHaveAccessibleName("Palm Grove, 2 of 3");
    // A later, deliberate click still works.
    fireEvent.click(screen.getByRole("button", { name: "Show next photo" }));
    expect(top()).toHaveAccessibleName("City lights bokeh at night, 3 of 3");
  });

  it("lets a short drag snap back", async () => {
    render(<PhotoStack photos={PHOTOS} />);
    await drag(top(), 30);
    await frame();
    expect(top()).toHaveAccessibleName("Desert Canyon, 1 of 3");
  });

  it("switches dragging off under reduced motion", () => {
    mockReducedMotion();
    render(<PhotoStack photos={PHOTOS} />);
    expect(top().className).not.toContain("cursor-grab");
  });

  it("offers the drag affordance normally", () => {
    render(<PhotoStack photos={PHOTOS} />);
    expect(top().className).toContain("cursor-grab");
  });

  it("names itself from aria-labelledby when given one", () => {
    render(
      <>
        <h2 id="trip">Road trip</h2>
        <PhotoStack photos={PHOTOS} aria-labelledby="trip" />
      </>,
    );
    expect(screen.getByRole("region", { name: "Road trip" })).toBeInTheDocument();
  });

  it("lets a consumer className win and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(<PhotoStack photos={PHOTOS} ref={ref} className="w-72" />);
    expect(ref.current).toBe(screen.getByRole("region"));
    expect(ref.current).toHaveClass("w-72");
    expect(ref.current).not.toHaveClass("w-56");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<PhotoStack photos={PHOTOS} controls />);
    await expectNoA11yViolations(container);
  });
});
