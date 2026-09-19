import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { createRef, useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ImageSelector, type SelectableImage } from "./image-selector";

const IMAGES: SelectableImage[] = [
  { id: "1", src: "/1.jpg", alt: "Woman in orange" },
  { id: "2", src: "/2.jpg", alt: "Girl in nature" },
  { id: "3", src: "/3.jpg", alt: "Metro platform" },
];

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
afterAll(() => {
  MotionGlobalConfig.skipAnimations = false;
});

describe("ImageSelector", () => {
  it("renders a named list of plain photos until Select mode", () => {
    render(<ImageSelector images={IMAGES} label="Gallery" />);
    expect(screen.getByRole("list", { name: "Gallery" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("enters Select mode and ticks photos from pointer and keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ImageSelector images={IMAGES} onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("0 selected");

    await user.click(screen.getByRole("checkbox", { name: "Woman in orange" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["1"]);
    expect(screen.getByRole("checkbox", { name: "Woman in orange" })).toBeChecked();

    await user.tab();
    expect(screen.getByRole("checkbox", { name: "Girl in nature" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("status")).toHaveTextContent("2 selected");

    await user.click(screen.getByRole("checkbox", { name: "Woman in orange" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["2"]);
  });

  it("clears the selection when leaving Select mode", async () => {
    const user = userEvent.setup();
    const onSelectingChange = vi.fn();
    render(
      <ImageSelector images={IMAGES} defaultSelecting onSelectingChange={onSelectingChange} />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Metro platform" }));
    await user.click(screen.getByRole("button", { name: "Select" }));
    expect(onSelectingChange).toHaveBeenCalledWith(false);
    await user.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.getByRole("status")).toHaveTextContent("0 selected");
  });

  it("shares the selected ids, and does nothing with none selected", async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    render(<ImageSelector images={IMAGES} defaultSelecting onShare={onShare} />);
    const share = screen.getByRole("button", { name: "Share selected" });
    expect(share).toHaveAttribute("aria-disabled", "true");
    share.focus();
    await user.keyboard("{Enter}");
    expect(onShare).not.toHaveBeenCalled();
    await user.click(screen.getByRole("checkbox", { name: "Girl in nature" }));
    await user.click(share);
    expect(onShare).toHaveBeenCalledWith(["2"]);
  });

  it("deletes selected photos, keeps focus on Delete, and Reset restores them", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<ImageSelector images={IMAGES} defaultSelecting onDelete={onDelete} />);
    expect(screen.queryByRole("button", { name: "Share selected" })).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Woman in orange" }));
    const del = screen.getByRole("button", { name: "Delete selected" });
    del.focus();
    await user.keyboard("{Enter}");
    expect(onDelete).toHaveBeenCalledWith(["1"]);
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(2));
    expect(del).toHaveFocus();
    expect(del).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");
    expect(onDelete).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Reset" }));
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(3));
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Reset" }).querySelector("[data-state=reset]"),
    ).not.toBeNull();
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<string[]>(["3"]);
      const [selecting, setSelecting] = useState(true);
      return (
        <>
          <ImageSelector
            images={IMAGES}
            value={value}
            onValueChange={setValue}
            selecting={selecting}
            onSelectingChange={setSelecting}
          />
          <output data-testid="out">{value.join(",")}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(screen.getByRole("checkbox", { name: "Metro platform" })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Woman in orange" }));
    expect(screen.getByTestId("out")).toHaveTextContent("3,1");
    await user.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.getByTestId("out")).toHaveTextContent("");
  });

  it("hides Reset on request and applies columns, className and ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ImageSelector
        ref={ref}
        images={IMAGES}
        showReset={false}
        columns={2}
        gridClassName="gap-4"
        className="gap-6"
        data-testid="root"
      />,
    );
    expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
    expect(ref.current).toBe(screen.getByTestId("root"));
    expect(ref.current).toHaveClass("gap-6");
    expect(ref.current).not.toHaveClass("gap-3");
    expect(screen.getByRole("list")).toHaveClass("grid-cols-2", "gap-4");
  });

  it("has no accessibility violations in either mode", async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageSelector images={IMAGES} onShare={() => {}} />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button", { name: "Select" }));
    await user.click(screen.getByRole("checkbox", { name: "Girl in nature" }));
    await expectNoA11yViolations(container);
  });
});
