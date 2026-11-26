import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { UploadButton, type UploadButtonStatus } from "./upload-button";

/**
 * Ends an animation by name. jsdom has no AnimationEvent, so React listens for
 * the WebKit-prefixed event; both names are sent with the name set by hand.
 */
function endAnimation(target: Element, animationName: string) {
  for (const type of ["animationend", "webkitAnimationEnd"]) {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, "animationName", { value: animationName });
    fireEvent(target, event);
  }
}

describe("UploadButton", () => {
  it("is a button named by its label", () => {
    render(<UploadButton />);
    expect(screen.getByRole("button", { name: "Upload" })).toHaveAttribute(
      "data-status",
      "idle",
    );
  });

  it("starts uploading on click and announces it", async () => {
    const user = userEvent.setup();
    render(<UploadButton />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(button).toHaveAttribute("data-status", "uploading");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Uploading");
  });

  it("starts from the keyboard", async () => {
    const user = userEvent.setup();
    render(<UploadButton />);
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveAttribute("data-status", "uploading");
  });

  it("runs the simulated sequence through done back to idle", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const { container } = render(<UploadButton onStatusChange={onStatusChange} />);
    const button = screen.getByRole("button");

    await user.click(button);
    endAnimation(
      container.querySelector("[data-slot=upload-button-track]")!,
      "dowel-upload-button-fill",
    );
    expect(button).toHaveAttribute("data-status", "done");
    expect(screen.getByRole("status")).toHaveTextContent("Uploaded");

    endAnimation(
      container.querySelector("[data-slot=upload-button-check] path")!,
      "dowel-upload-button-hold",
    );
    expect(button).toHaveAttribute("data-status", "idle");
    expect(onStatusChange).toHaveBeenNthCalledWith(1, "uploading");
    expect(onStatusChange).toHaveBeenNthCalledWith(2, "done");
    expect(onStatusChange).toHaveBeenNthCalledWith(3, "idle");
  });

  it("ignores presses while working", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<UploadButton defaultStatus="uploading" onStatusChange={onStatusChange} />);
    await user.click(screen.getByRole("button"));
    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it("follows a controlled status and real progress", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [status, setStatus] = useState<UploadButtonStatus>("idle");
      return <UploadButton status={status} onStatusChange={setStatus} progress={0.5} />;
    }
    const { container } = render(<Controlled />);
    await user.click(screen.getByRole("button"));
    const track = container.querySelector("[data-slot=upload-button-track]")!;
    expect(track).toHaveAttribute("stroke-dashoffset", "50");
    expect(track).not.toHaveAttribute("data-simulated");
  });

  it("does not announce the status it mounted with", () => {
    render(<UploadButton defaultStatus="done" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("forwards its ref and merges className", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<UploadButton ref={ref} className="custom" />);
    expect(ref.current).toBe(screen.getByRole("button"));
    expect(ref.current).toHaveClass("custom", "rounded-full");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<UploadButton />);
    await expectNoA11yViolations(container);
  });
});
