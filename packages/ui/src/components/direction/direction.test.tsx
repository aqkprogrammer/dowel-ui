import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";

import { DirectionProvider } from "./direction";

function Field() {
  return (
    <Select defaultValue="one">
      <SelectTrigger aria-label="Number">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="one">One</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("DirectionProvider", () => {
  it("renders its children untouched", () => {
    render(
      <DirectionProvider dir="rtl">
        <p>Content</p>
      </DirectionProvider>,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("makes a primitive follow the writing direction", () => {
    // The whole reason this exists: without a provider the primitives assume
    // left-to-right and set dir="ltr" themselves, so a page mirrors everywhere
    // except its menus and selects.
    render(
      <DirectionProvider dir="rtl">
        <Field />
      </DirectionProvider>,
    );

    expect(screen.getByRole("combobox", { name: "Number" })).toHaveAttribute("dir", "rtl");
  });

  it("leaves a primitive left-to-right when told to", () => {
    render(
      <DirectionProvider dir="ltr">
        <Field />
      </DirectionProvider>,
    );

    expect(screen.getByRole("combobox", { name: "Number" })).toHaveAttribute("dir", "ltr");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <DirectionProvider dir="rtl">
        <Field />
      </DirectionProvider>,
    );
    await expectNoA11yViolations(container);
  });
});
