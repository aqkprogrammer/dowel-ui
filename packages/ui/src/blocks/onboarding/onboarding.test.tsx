import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { describeProgress, OnboardingBlock, type OnboardingStep } from "./onboarding";

const STEPS: OnboardingStep[] = [
  { id: "account", title: "Create your account", status: "done" },
  {
    id: "team",
    title: "Invite your team",
    description: "Add the people who will use this with you.",
    status: "current",
    actionLabel: "Invite",
    estimate: "2 minutes",
  },
  {
    id: "repo",
    title: "Connect a repository",
    status: "blocked",
    blockedReason: "An owner has to grant access to the organisation first.",
    actionLabel: "Connect",
  },
  { id: "deploy", title: "Deploy", status: "todo", actionLabel: "Start" },
];

describe("describeProgress", () => {
  it("counts steps rather than quoting a percentage", () => {
    expect(describeProgress(STEPS)).toBe("1 of 4 steps done.");
  });

  it("says so when everything is done", () => {
    expect(describeProgress(STEPS.map((step) => ({ ...step, status: "done" })))).toBe(
      "All 4 steps done.",
    );
  });

  it("does not produce a broken sentence with no steps", () => {
    expect(describeProgress([])).toBe("Nothing to set up.");
  });
});

describe("OnboardingBlock", () => {
  it("states each step's state in a word, not only as a tick", () => {
    render(<OnboardingBlock steps={STEPS} />);

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Not started")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("marks the current step so it can be found, not just seen", () => {
    render(<OnboardingBlock steps={STEPS} />);

    const current = screen.getByText("Invite your team").closest("li");
    expect(current).toHaveAttribute("aria-current", "step");

    // Exactly one — "current" is a position, not a style.
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  });

  it("renders the steps as an ordered list", () => {
    render(<OnboardingBlock steps={STEPS} />);

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
  });

  it("hides the progress bar, so the count is announced once", () => {
    const { container } = render(<OnboardingBlock steps={STEPS} />);

    expect(screen.getByText("1 of 4 steps done.")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="progress"]')).toHaveAttribute("aria-hidden");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("names each action after its step", () => {
    render(<OnboardingBlock steps={STEPS} />);

    // Not four buttons called "Start"/"Invite" with nothing to tell them apart.
    expect(
      screen.getByRole("button", { name: "Invite: Invite your team" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start: Deploy" })).toBeInTheDocument();
  });

  it("says why a blocked step cannot be started, and does not offer it", () => {
    render(<OnboardingBlock steps={STEPS} />);

    expect(
      screen.getByText("An owner has to grant access to the organisation first."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Connect: Connect a repository" }),
    ).toBeDisabled();
  });

  it("offers no action on a step already done", () => {
    render(
      <OnboardingBlock
        steps={[
          { id: "a", title: "Create your account", status: "done", actionLabel: "Start" },
        ]}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("runs a step's action from the keyboard", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <OnboardingBlock
        steps={[
          {
            id: "a",
            title: "Invite your team",
            status: "current",
            actionLabel: "Invite",
            onAction,
          },
        ]}
      />,
    );

    screen.getByRole("button", { name: "Invite: Invite your team" }).focus();
    await user.keyboard("{Enter}");

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("changes what it says once everything is done", () => {
    render(<OnboardingBlock steps={STEPS.map((step) => ({ ...step, status: "done" }))} />);

    expect(screen.getByRole("heading", { name: "You are all set" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Get set up" })).not.toBeInTheDocument();
  });

  it("does not claim completion with no steps at all", () => {
    render(<OnboardingBlock steps={[]} />);
    expect(screen.getByRole("heading", { name: "Get set up" })).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<OnboardingBlock steps={STEPS} />);
    await expectNoA11yViolations(container);
  });
});
