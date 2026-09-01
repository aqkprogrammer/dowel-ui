import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ModelSelector, type ModelOption } from "./ai-model-selector";

const MODELS: ModelOption[] = [
  { id: "fast", name: "Fast", description: "Quick answers.", group: "General" },
  { id: "balanced", name: "Balanced", description: "The default.", group: "General" },
  {
    id: "deep",
    name: "Deep Research",
    group: "Advanced",
    disabled: true,
    disabledReason: "Available on the Pro plan",
  },
];

describe("ModelSelector", () => {
  it("shows a placeholder until a model is chosen", () => {
    render(<ModelSelector models={MODELS} aria-label="Model" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Select a model");
  });

  it("lists the models, grouped", async () => {
    const user = userEvent.setup();
    render(<ModelSelector models={MODELS} aria-label="Model" />);

    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: /Fast/ })).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("shows each model's description", async () => {
    const user = userEvent.setup();
    render(<ModelSelector models={MODELS} aria-label="Model" />);

    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Quick answers.")).toBeInTheDocument();
  });

  it("says why an unavailable model cannot be chosen", async () => {
    const user = userEvent.setup();
    render(<ModelSelector models={MODELS} aria-label="Model" />);

    await user.click(screen.getByRole("combobox"));
    // A disabled option with no reason reads as a broken interface.
    expect(await screen.findByText("Available on the Pro plan")).toBeInTheDocument();
  });

  it("does not select a disabled model", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<ModelSelector models={MODELS} aria-label="Model" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /Deep Research/ }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("reports the chosen model", async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    render(<ModelSelector models={MODELS} aria-label="Model" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /Balanced/ }));
    expect(onValueChange).toHaveBeenCalledWith("balanced");
  });

  it("shows the chosen model's name, not its description", async () => {
    render(<ModelSelector models={MODELS} aria-label="Model" defaultValue="fast" />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Fast");
    });
    expect(screen.getByRole("combobox")).not.toHaveTextContent("Quick answers.");
  });

  it("keeps the order it was given rather than sorting groups", async () => {
    const user = userEvent.setup();
    render(<ModelSelector models={MODELS} aria-label="Model" />);

    await user.click(screen.getByRole("combobox"));
    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent?.slice(0, 4))).toEqual([
      "Fast",
      "Bala",
      "Deep",
    ]);
  });

  it("works without groups", async () => {
    const user = userEvent.setup();
    render(
      <ModelSelector
        models={[
          { id: "a", name: "Model A" },
          { id: "b", name: "Model B" },
        ]}
        aria-label="Model"
      />,
    );

    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Model A" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <>
        <span id="model-label">Model</span>
        <ModelSelector models={MODELS} aria-labelledby="model-label" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
