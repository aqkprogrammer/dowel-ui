import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  SessionExpiry,
  describeCountdown,
  formatCountdown,
  secondsLeft,
  sessionPhase,
  type SessionExpiryProps,
} from "./session-expiry";

const EXPIRES = new Date("2026-09-04T12:00:00Z");
const at = (secondsBefore: number) => new Date(EXPIRES.getTime() - secondsBefore * 1000);

function Example(props: Partial<SessionExpiryProps> = {}) {
  return (
    <SessionExpiry
      expiresAt={EXPIRES}
      now={at(90)}
      onExtend={vi.fn()}
      onExpire={vi.fn()}
      onSignOut={vi.fn()}
      {...props}
    />
  );
}

const dialog = () => screen.getByRole("alertdialog");
const status = () => screen.getByRole("status");
const stay = () => screen.getByRole("button", { name: /Stay signed in/ });

afterEach(() => {
  vi.useRealTimers();
});

describe("session model", () => {
  it("is active, then warning inside the window, then expired", () => {
    expect(sessionPhase(EXPIRES, at(300), 120_000)).toBe("active");
    expect(sessionPhase(EXPIRES, at(120), 120_000)).toBe("warning");
    expect(sessionPhase(EXPIRES, at(1), 120_000)).toBe("warning");
    expect(sessionPhase(EXPIRES, at(0), 120_000)).toBe("expired");
    expect(sessionPhase(EXPIRES, at(-5), 120_000)).toBe("expired");
  });

  it("counts whole seconds up, never below zero", () => {
    expect(secondsLeft(EXPIRES, at(90))).toBe(90);
    expect(secondsLeft(EXPIRES, new Date(EXPIRES.getTime() - 1500))).toBe(2);
    expect(secondsLeft(EXPIRES, at(-10))).toBe(0);
  });

  it("formats for the screen and for the ear", () => {
    expect(formatCountdown(119)).toBe("1:59");
    expect(formatCountdown(5)).toBe("0:05");
    expect(describeCountdown(119)).toBe("1 minute 59 seconds");
    expect(describeCountdown(120)).toBe("2 minutes");
    expect(describeCountdown(1)).toBe("1 second");
    expect(describeCountdown(0)).toBe("0 seconds");
  });
});

describe("SessionExpiry", () => {
  it("renders nothing while the session is comfortably alive", () => {
    render(<Example now={at(600)} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders nothing on the server, where the clock is unknown", () => {
    const markup = renderToStaticMarkup(
      <SessionExpiry expiresAt={new Date(0)} onExtend={() => undefined} />,
    );
    expect(markup).toBe("");
  });

  it("warns as an alert dialog inside the window, with the time left", () => {
    render(<Example />);

    expect(dialog()).toHaveAccessibleName("Your session is about to end");
    expect(dialog()).toHaveAccessibleDescription(
      /You will be signed out in 1 minute 30 seconds/,
    );
    expect(screen.getByText("1:30")).toBeInTheDocument();
  });

  it("warns at the window you set", () => {
    const { rerender } = render(<Example now={at(200)} warnBefore={180_000} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    rerender(<Example now={at(170)} warnBefore={180_000} />);
    expect(dialog()).toBeInTheDocument();
  });

  it("puts focus on staying signed in, not on signing out", () => {
    render(<Example />);
    expect(stay()).toHaveFocus();
  });

  it("says what is at stake", () => {
    render(
      <Example>
        <p>Unsaved edits to the proposal will be lost.</p>
      </Example>,
    );
    expect(screen.getByText(/Unsaved edits/)).toBeInTheDocument();
  });

  describe("cannot be waved away", () => {
    it("ignores Escape", async () => {
      const user = userEvent.setup();
      render(<Example />);

      await user.keyboard("{Escape}");
      expect(dialog()).toBeInTheDocument();
    });

    it("offers no close button", () => {
      render(<Example />);
      expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    });
  });

  describe("choosing", () => {
    it("extends, and closes once the expiry moves out of the window", async () => {
      const onExtend = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(<Example onExtend={onExtend} />);

      await user.click(stay());
      expect(onExtend).toHaveBeenCalledTimes(1);

      rerender(<Example expiresAt={new Date(EXPIRES.getTime() + 600_000)} />);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("waits for an extend that returns a promise", async () => {
      let finish: () => void = () => undefined;
      const onExtend = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      const user = userEvent.setup();
      render(<Example onExtend={onExtend} />);

      await user.click(stay());
      expect(stay()).toHaveAttribute("aria-busy", "true");

      finish();
      await vi.waitFor(() => {
        expect(stay()).not.toHaveAttribute("aria-busy");
      });
    });

    it("signs out on request", async () => {
      const onSignOut = vi.fn();
      const user = userEvent.setup();
      render(<Example onSignOut={onSignOut} />);

      await user.click(screen.getByRole("button", { name: "Sign out now" }));
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it("offers only staying when there is no sign-out handler", () => {
      render(<Example onSignOut={undefined} />);
      expect(screen.queryByRole("button", { name: "Sign out now" })).not.toBeInTheDocument();
      expect(stay()).toBeInTheDocument();
    });
  });

  describe("announcing", () => {
    it("says the warning once when it opens, with the time left", () => {
      render(<Example />);
      expect(status()).toHaveTextContent(
        "Your session is about to end. 1 minute 30 seconds left.",
      );
    });

    it("is quiet between the moments that matter", () => {
      const { rerender } = render(<Example now={at(90)} />);
      rerender(<Example now={at(89)} />);
      rerender(<Example now={at(75)} />);

      expect(status()).toHaveTextContent("1 minute 30 seconds left.");
    });

    it("speaks at one minute, thirty seconds and ten", () => {
      const { rerender } = render(<Example now={at(90)} />);

      rerender(<Example now={at(60)} />);
      expect(status()).toHaveTextContent(/^1 minute left\.$/);

      rerender(<Example now={at(45)} />);
      expect(status()).toHaveTextContent(/^1 minute left\.$/);

      rerender(<Example now={at(30)} />);
      expect(status()).toHaveTextContent(/^30 seconds left\.$/);

      rerender(<Example now={at(10)} />);
      expect(status()).toHaveTextContent(/^10 seconds left\.$/);
    });

    it("still speaks a threshold a slow tick skipped over", () => {
      const { rerender } = render(<Example now={at(90)} />);
      rerender(<Example now={at(25)} />);
      expect(status()).toHaveTextContent(/^25 seconds left\.$/);
    });

    it("starts afresh after an extension", () => {
      const { rerender } = render(<Example now={at(60)} />);
      expect(status()).toHaveTextContent(/1 minute left/);

      const later = new Date(EXPIRES.getTime() + 600_000);
      rerender(<Example expiresAt={later} now={at(60)} />);
      rerender(<Example expiresAt={later} now={new Date(later.getTime() - 90_000)} />);

      expect(status()).toHaveTextContent(
        "Your session is about to end. 1 minute 30 seconds left.",
      );
    });
  });

  describe("when time runs out", () => {
    it("says so, fires once, and offers what the app provides next", () => {
      const onExpire = vi.fn();
      const { rerender } = render(
        <Example onExpire={onExpire} expiredAction={<a href="/sign-in">Sign in again</a>} />,
      );

      rerender(
        <Example
          now={at(0)}
          onExpire={onExpire}
          expiredAction={<a href="/sign-in">Sign in again</a>}
        />,
      );

      expect(dialog()).toHaveAccessibleName("Your session has ended");
      expect(status()).toHaveTextContent("Your session has ended.");
      expect(screen.getByRole("link", { name: "Sign in again" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Stay signed in/ })).not.toBeInTheDocument();

      rerender(<Example now={at(-5)} onExpire={onExpire} />);
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it("fires again for a new expiry that also runs out", () => {
      const onExpire = vi.fn();
      const { rerender } = render(<Example now={at(0)} onExpire={onExpire} />);
      expect(onExpire).toHaveBeenCalledTimes(1);

      const later = new Date(EXPIRES.getTime() + 600_000);
      rerender(<Example expiresAt={later} now={at(0)} onExpire={onExpire} />);
      rerender(<Example expiresAt={later} now={later} onExpire={onExpire} />);
      expect(onExpire).toHaveBeenCalledTimes(2);
    });
  });

  it("ticks on its own when no clock is given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(91));
    render(<SessionExpiry expiresAt={EXPIRES} onExtend={vi.fn()} />);

    expect(screen.getByText("1:31")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("1:29")).toBeInTheDocument();
  });

  it("has no accessibility violations warning and expired", async () => {
    const { baseElement, rerender } = render(<Example />);
    await expectNoA11yViolations(baseElement);

    rerender(<Example now={at(0)} expiredAction={<a href="/sign-in">Sign in again</a>} />);
    await expectNoA11yViolations(baseElement);
  });
});
