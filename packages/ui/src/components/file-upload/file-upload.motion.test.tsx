import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { FileUpload, FileUploadList } from "./file-upload";
import type { QueuedFile } from "./upload-queue";

function entry(name: string, over: Partial<QueuedFile> = {}): QueuedFile {
  return {
    id: name,
    file: new File(["x"], name, { type: "text/plain" }),
    status: "done",
    progress: 1,
    attempts: 1,
    ...over,
  };
}

function List({ animateExit }: { animateExit?: boolean }) {
  const [files, setFiles] = useState([entry("a.txt"), entry("b.txt"), entry("c.txt")]);
  return (
    <FileUploadList
      files={files}
      animateExit={animateExit}
      onRemove={(id) => setFiles((current) => current.filter((file) => file.id !== id))}
    />
  );
}

function rows(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>("[data-slot='file-upload-item']")];
}

afterEach(() => {
  vi.useRealTimers();
});

describe("FileUpload motion", () => {
  it("swells the dropzone while a drag is over it", () => {
    const { container } = render(<FileUpload label="Upload" onFiles={() => undefined} />);
    const zone = container.querySelector<HTMLElement>("[data-slot='file-upload-dropzone']")!;
    expect(zone).toHaveClass("duration-[var(--duration-fast)]");
    expect(zone).not.toHaveClass("scale-[1.02]");
    fireEvent.dragEnter(zone);
    expect(zone).toHaveClass("scale-[1.02]");
    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass("scale-[1.02]");
  });

  it("renders no icon unless given one", () => {
    const { container } = render(<FileUpload label="Upload" onFiles={() => undefined} />);
    expect(container.querySelector("[data-slot='file-upload-icon']")).toBeNull();
  });

  it("lifts a decorative icon during a drag", () => {
    const { container } = render(
      <FileUpload label="Upload" onFiles={() => undefined} icon={<svg data-testid="icon" />} />,
    );
    const icon = container.querySelector<HTMLElement>("[data-slot='file-upload-icon']")!;
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(icon).not.toHaveClass("-translate-y-1");
    fireEvent.dragEnter(container.querySelector("[data-slot='file-upload-dropzone']")!);
    expect(icon).toHaveClass("-translate-y-1", "scale-115");
    // Still named by the label alone.
    expect(screen.getByLabelText(/Upload/)).toHaveAttribute("type", "file");
  });

  it("ships row keyframes on duration tokens, mirrored for RTL", () => {
    render(<FileUploadList files={[entry("a.txt")]} />);
    const css =
      document.head.querySelector("style[data-href='dowel-file-upload']")?.textContent ?? "";
    expect(css).toContain("@keyframes dowel-file-upload-in");
    expect(css).toContain(":dir(rtl)");
    expect(css).toContain("var(--duration-normal)");
    expect(css).not.toMatch(/\d+ms/);
  });

  it("removes a row immediately by default", async () => {
    const user = userEvent.setup();
    const { container } = render(<List />);
    await user.click(screen.getByRole("button", { name: "Remove b.txt" }));
    expect(rows(container)).toHaveLength(2);
    expect(screen.queryByText("b.txt")).not.toBeInTheDocument();
  });

  describe("with animateExit", () => {
    it("keeps a hidden, inert, buttonless row in the removed file's place", async () => {
      const user = userEvent.setup();
      const { container } = render(<List animateExit />);
      await user.click(screen.getByRole("button", { name: "Remove b.txt" }));

      const all = rows(container);
      expect(all).toHaveLength(3);
      const leaving = all[1]!;
      expect(leaving).toHaveTextContent("b.txt");
      expect(leaving).toHaveAttribute("data-state", "closed");
      expect(leaving).toHaveAttribute("aria-hidden", "true");
      expect(leaving).toHaveAttribute("inert");
      expect(leaving.querySelector("button")).toBeNull();
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });

    it("drops the row when its own exit animation ends", async () => {
      const user = userEvent.setup();
      const { container } = render(<List animateExit />);
      await user.click(screen.getByRole("button", { name: "Remove a.txt" }));
      const leaving = container.querySelector<HTMLElement>("[data-state='closed']")!;
      fireEvent.animationEnd(leaving.firstElementChild!);
      expect(leaving).toBeInTheDocument();
      fireEvent.animationEnd(leaving);
      expect(rows(container)).toHaveLength(2);
    });

    it("keeps the list mounted while the last row leaves, then removes it", () => {
      vi.useFakeTimers();
      const { container, rerender } = render(
        <FileUploadList files={[entry("a.txt")]} animateExit />,
      );
      rerender(<FileUploadList files={[]} animateExit />);
      expect(container.querySelector("[data-slot='file-upload-list']")).not.toBeNull();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.querySelector("[data-slot='file-upload-list']")).toBeNull();
    });

    it("cancels the departure if the file returns", () => {
      const a = entry("a.txt");
      const { container, rerender } = render(<FileUploadList files={[a]} animateExit />);
      rerender(<FileUploadList files={[]} animateExit />);
      rerender(<FileUploadList files={[a]} animateExit />);
      expect(container.querySelector("[data-state='closed']")).toBeNull();
      expect(rows(container)).toHaveLength(1);
    });

    it("has no accessibility violations mid-exit", async () => {
      const user = userEvent.setup();
      const { container } = render(<List animateExit />);
      await user.click(screen.getByRole("button", { name: "Remove a.txt" }));
      await expectNoA11yViolations(container);
    });
  });
});
