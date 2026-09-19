import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FaqAccordionBlock } from "./faq-accordion";

function stubObserver() {
  let fire: ((isIntersecting: boolean) => void) | undefined;
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        fire = (isIntersecting) => {
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        };
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  return { fire: (value = true) => fire?.(value), disconnect };
}

function belowFold() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 5000,
  } as DOMRect);
}

const root = (container: HTMLElement) =>
  container.querySelector("[data-slot=faq-accordion]") as HTMLElement;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FaqAccordionBlock", () => {
  it("is a section named by its heading", () => {
    render(<FaqAccordionBlock />);
    expect(screen.getByRole("region", { name: "Frequently asked questions" })).toBeVisible();
  });

  it("puts each question in a heading, with the first answer open", () => {
    render(<FaqAccordionBlock />);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
    expect(screen.getByRole("button", { name: "What is this product?" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Is it free to use?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("keeps one answer open at a time, and can close it", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionBlock />);
    const second = screen.getByRole("button", { name: "How do I get started?" });

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "What is this product?" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "false");
  });

  it("moves between questions with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<FaqAccordionBlock />);
    screen.getByRole("button", { name: "What is this product?" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "How do I get started?" })).toHaveFocus();
  });

  it("takes its content from props", () => {
    render(
      <FaqAccordionBlock
        heading="Questions"
        description={null}
        items={[
          { id: "a", question: "One?", answer: "Yes." },
          { id: "b", question: "Two?", answer: "No." },
        ]}
        defaultOpen="b"
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Questions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Two?" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("No.")).toBeVisible();
  });

  it("can start with every answer closed", () => {
    render(<FaqAccordionBlock defaultOpen={null} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("renders an empty list without failing", () => {
    render(<FaqAccordionBlock items={[]} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("re-levels the section heading", () => {
    render(<FaqAccordionBlock headingLevel={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Frequently asked questions",
    );
  });

  it("lets a consumer className win and forwards the ref", () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<FaqAccordionBlock ref={ref} className="max-w-none" />);
    expect(root(container)).toHaveClass("max-w-none");
    expect(root(container)).not.toHaveClass("max-w-4xl");
    expect(ref.current).toBe(root(container));
  });

  it("calls a callback ref", () => {
    const ref = vi.fn();
    render(<FaqAccordionBlock ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLElement));
  });

  it("reveals a list that starts below the fold once it scrolls in", () => {
    belowFold();
    const observer = stubObserver();
    const { container } = render(<FaqAccordionBlock />);
    expect(root(container)).toHaveAttribute("data-reveal", "pending");
    act(() => {
      observer.fire(false);
    });
    expect(root(container)).toHaveAttribute("data-reveal", "pending");
    act(() => {
      observer.fire(true);
    });
    expect(root(container)).toHaveAttribute("data-reveal", "shown");
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it("never hides anything under reduced motion", () => {
    belowFold();
    stubObserver();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(<FaqAccordionBlock />);
    expect(root(container)).not.toHaveAttribute("data-reveal");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<FaqAccordionBlock />);
    await expectNoA11yViolations(container);
  });
});
