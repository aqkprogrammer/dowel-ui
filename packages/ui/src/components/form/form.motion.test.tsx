import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Input } from "../input";
import { Form, FormControl, FormField, FormLabel, FormMessage } from "./form";

function Example({ error, animateExit }: { error?: string; animateExit?: boolean }) {
  return (
    <Form>
      <FormField name="email" error={error}>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input type="email" />
        </FormControl>
        <FormMessage animateExit={animateExit} className="text-sm" />
      </FormField>
    </Form>
  );
}

const MESSAGE = "Enter a valid email address.";

afterEach(() => {
  vi.useRealTimers();
});

describe("FormMessage motion", () => {
  it("marks a present message open so it animates in", () => {
    render(<Example error={MESSAGE} />);
    const message = screen.getByText(MESSAGE);
    expect(message).toHaveAttribute("data-state", "open");
    expect(message).toHaveClass("text-sm");
    expect(message).not.toHaveClass("text-xs");
  });

  it("ships its keyframes, timed by duration tokens", () => {
    render(<Example error={MESSAGE} />);
    const sheet = document.head.querySelector("style[data-href='dowel-form-message']");
    const css = sheet?.textContent ?? "";
    expect(css).toContain("@keyframes dowel-form-message-in");
    expect(css).toContain("var(--duration-normal)");
    expect(css).toContain("var(--duration-fast)");
    expect(css).not.toMatch(/\d+ms/);
  });

  it("removes a cleared message immediately by default", () => {
    const { rerender } = render(<Example error={MESSAGE} />);
    rerender(<Example />);
    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });

  describe("with animateExit", () => {
    it("keeps a departing copy that is hidden, unnamed and not described", () => {
      const { rerender } = render(<Example error={MESSAGE} animateExit />);
      const input = screen.getByRole("textbox");
      rerender(<Example animateExit />);

      const leaving = screen.getByText(MESSAGE);
      expect(leaving).toHaveAttribute("data-state", "closed");
      expect(leaving).toHaveAttribute("aria-hidden", "true");
      expect(leaving).not.toHaveAttribute("id");
      expect(leaving).not.toHaveAttribute("role");
      expect(input).not.toHaveAttribute("aria-invalid");
      expect(input).not.toHaveAttribute("aria-describedby");
    });

    it("unmounts the copy when its exit animation ends", () => {
      const { rerender } = render(<Example error={MESSAGE} animateExit />);
      rerender(<Example animateExit />);
      fireEvent.animationEnd(screen.getByText(MESSAGE));
      expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    });

    it("ignores animations that end on descendants", () => {
      const { rerender } = render(
        <Form>
          <FormField name="x" error={<span>Bad</span>}>
            <FormMessage animateExit />
          </FormField>
        </Form>,
      );
      rerender(
        <Form>
          <FormField name="x">
            <FormMessage animateExit />
          </FormField>
        </Form>,
      );
      fireEvent.animationEnd(screen.getByText("Bad"));
      expect(screen.getByText("Bad")).toBeInTheDocument();
    });

    it("falls back to a timer when no animation runs — as under reduced motion without CSS", () => {
      vi.useFakeTimers();
      const { rerender } = render(<Example error={MESSAGE} animateExit />);
      rerender(<Example animateExit />);
      expect(screen.getByText(MESSAGE)).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
    });

    it("replaces the departing copy when a new error arrives", () => {
      const { rerender } = render(<Example error={MESSAGE} animateExit />);
      rerender(<Example animateExit />);
      rerender(<Example error="Required." animateExit />);
      expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
      const message = screen.getByText("Required.");
      expect(message).toHaveAttribute("data-state", "open");
      expect(message).toHaveAttribute("role", "status");
      expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Required.");
    });

    it("has no accessibility violations mid-exit", async () => {
      const { container, rerender } = render(<Example error={MESSAGE} animateExit />);
      rerender(<Example animateExit />);
      await expectNoA11yViolations(container);
    });
  });
});
