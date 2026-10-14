import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  defaultPasswordRules,
  isCommonPassword,
  PasswordStrength,
  scorePassword,
} from "./password-strength";

const meter = () => screen.getByRole("meter", { name: "Password strength" });

describe("PasswordStrength", () => {
  it("is a meter whose level is spoken in words", async () => {
    const { container } = render(<PasswordStrength value="Correct horse 9" />);
    expect(meter()).toHaveAttribute("aria-valuenow", "4");
    expect(meter()).toHaveAttribute("aria-valuemax", "4");
    expect(meter()).toHaveAttribute("aria-valuetext", "Strong");
    expect(screen.getByText("Strong")).toHaveAttribute("aria-live", "polite");
    await expectNoA11yViolations(container);
  });

  it("says nothing is there yet for an empty password", () => {
    render(<PasswordStrength value="" />);
    expect(meter()).toHaveAttribute("aria-valuenow", "0");
    expect(meter()).toHaveAttribute("aria-valuetext", "No password yet");
    for (const item of screen.getAllByRole("listitem"))
      expect(item).toHaveTextContent("not met");
  });

  it("lists each rule and whether it is met, in words", () => {
    render(<PasswordStrength value="abcdefghijkl" />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "At least 12 characters — met",
      "Upper and lower case letters — not met",
      "A number — not met",
      "A symbol or space — not met",
      "Not a commonly used password — met",
    ]);
  });

  it("caps a short or common password at Weak, however varied", () => {
    render(<PasswordStrength value="Aa1!" />);
    expect(meter()).toHaveAttribute("aria-valuetext", "Weak");
  });

  it("follows minLength and custom rules", () => {
    const { rerender } = render(<PasswordStrength value="Ab1!efgh" minLength={8} />);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("At least 8 characters — met");
    expect(meter()).toHaveAttribute("aria-valuetext", "Strong");

    rerender(
      <PasswordStrength
        value="tango-tango"
        rules={[
          { id: "dash", label: "Contains a dash", test: (value) => value.includes("-") },
          { id: "long", label: "16 or more", test: (value) => value.length >= 16 },
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(meter()).toHaveAttribute("aria-valuenow", "2");
  });

  it("reports the score after render, once per change", () => {
    const onScoreChange = vi.fn();
    const { rerender } = render(<PasswordStrength value="a" onScoreChange={onScoreChange} />);
    expect(onScoreChange).toHaveBeenCalledTimes(1);
    rerender(<PasswordStrength value="b" onScoreChange={onScoreChange} />);
    expect(onScoreChange).toHaveBeenCalledTimes(1);
    rerender(<PasswordStrength value="Correct horse 9" onScoreChange={onScoreChange} />);
    expect(onScoreChange).toHaveBeenCalledTimes(2);
    expect(onScoreChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ score: 4, level: "Strong" }),
    );
  });

  it("can hide the checklist, lets className win and forwards its ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PasswordStrength ref={ref} value="x" showRules={false} className="gap-4" id="pw-help" />,
    );
    expect(screen.queryByRole("list")).toBeNull();
    expect(ref.current).toHaveAttribute("id", "pw-help");
    expect(ref.current).toHaveClass("gap-4");
    expect(ref.current).not.toHaveClass("gap-2");
  });
});

describe("password scoring", () => {
  const rules = defaultPasswordRules(12);

  it("scores from the share of rules met", () => {
    expect(scorePassword("", rules).score).toBe(0);
    expect(scorePassword("abcdefghijkl", rules).level).toBe("Fair");
    expect(scorePassword("Abcdefghijkl", rules).level).toBe("Fair");
    expect(scorePassword("Abcdefghijk1", rules).level).toBe("Good");
    expect(scorePassword("Abcdefghij1!", rules).level).toBe("Strong");
    expect(scorePassword("anything", []).score).toBe(0);
  });

  it("knows mixed case beyond ASCII", () => {
    expect(scorePassword("Ärger und ärger", rules).results[1]?.met).toBe(true);
  });

  it("spots the passwords everyone tries first, ignoring case", () => {
    expect(isCommonPassword("Password1")).toBe(true);
    expect(isCommonPassword(" qwerty ")).toBe(true);
    expect(isCommonPassword("violet-lighthouse")).toBe(false);
    expect(scorePassword("Password123", rules).score).toBeLessThanOrEqual(1);
  });
});
