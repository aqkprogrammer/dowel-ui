import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  SyncStatus,
  describeSyncState,
  syncState,
  useOnlineStatus,
  type SyncStatusProps,
} from "./sync-status";

function Example(props: Partial<SyncStatusProps> = {}) {
  return <SyncStatus online {...props} />;
}

const text = () => document.querySelector("[data-slot='sync-status-text']");
const announcement = () => screen.getByRole("status");

function setBrowserOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { value: online, configurable: true });
}

afterEach(() => {
  setBrowserOnline(true);
});

describe("syncState", () => {
  it("prefers error, then offline, then syncing, then pending, then synced", () => {
    expect(syncState({ online: false, syncing: true, pending: 2, error: "Timed out" })).toBe(
      "error",
    );
    expect(syncState({ online: false, syncing: true, pending: 2 })).toBe("offline");
    expect(syncState({ online: true, syncing: true, pending: 2 })).toBe("syncing");
    expect(syncState({ online: true, pending: 2 })).toBe("pending");
    expect(syncState({ online: true })).toBe("synced");
  });

  it("treats an empty error as no error", () => {
    expect(syncState({ online: true, error: "" })).toBe("synced");
    expect(syncState({ online: true, error: null })).toBe("synced");
  });
});

describe("describeSyncState", () => {
  it("counts changes, singular and plural", () => {
    expect(describeSyncState("pending", 1)).toBe("1 change waiting to save");
    expect(describeSyncState("pending", 3)).toBe("3 changes waiting to save");
    expect(describeSyncState("offline", 1)).toBe(
      "Offline. 1 change will save when you're back online.",
    );
  });

  it("says what will happen offline, with or without changes", () => {
    expect(describeSyncState("offline", 0)).toBe(
      "Offline. Changes will save when you're back online.",
    );
  });

  it("carries the error's own words", () => {
    expect(describeSyncState("error", 2, "The server is not responding.")).toBe(
      "Could not save 2 changes. The server is not responding.",
    );
    expect(describeSyncState("error", 0)).toBe("Could not save.");
  });

  it("says saving, with the count when there is one", () => {
    expect(describeSyncState("syncing", 0)).toBe("Saving…");
    expect(describeSyncState("syncing", 4)).toBe("Saving 4 changes…");
    expect(describeSyncState("synced")).toBe("All changes saved");
  });
});

describe("useOnlineStatus", () => {
  it("reads the browser and follows its events", () => {
    setBrowserOnline(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      setBrowserOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      setBrowserOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("assumes online on the server, where there is no interface to report", () => {
    const markup = renderToStaticMarkup(<SyncStatus />);
    expect(markup).toContain("All changes saved");
    expect(markup).not.toContain("Offline");
  });
});

describe("SyncStatus", () => {
  it("says the state in words, with the dot as decoration", () => {
    const { container } = render(<Example />);

    expect(text()).toHaveTextContent("All changes saved");
    expect(container.querySelector("[data-slot='sync-status']")).toHaveAttribute(
      "data-state",
      "synced",
    );
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("shows when the last save happened, as a time", () => {
    render(<Example lastSyncedAt={new Date("2026-09-04T14:42:00Z")} locale="en-GB" />);
    expect(text()).toHaveTextContent(/All changes saved at \d\d:\d\d/);
  });

  it("does not claim a time for a state that is not saved", () => {
    render(<Example pending={2} lastSyncedAt={new Date("2026-09-04T14:42:00Z")} />);
    expect(text()).toHaveTextContent("2 changes waiting to save");
    expect(text()).not.toHaveTextContent(/at \d/);
  });

  it("reads the browser when no online prop is given", () => {
    setBrowserOnline(false);
    render(<SyncStatus pending={1} />);
    expect(text()).toHaveTextContent("Offline. 1 change will save when you're back online.");
  });

  it("lets a failed request outrank a browser that says it is online", () => {
    render(<Example error="The server is not responding." pending={1} />);
    expect(text()).toHaveTextContent("Could not save 1 change. The server is not responding.");
  });

  describe("announcing", () => {
    it("has its region in place, and says nothing, from the start", () => {
      render(<Example />);
      expect(announcement()).toHaveAttribute("aria-live", "polite");
      expect(announcement()).toBeEmptyDOMElement();
    });

    it("says nothing for the ordinary churn of saving", () => {
      const { rerender } = render(<Example />);

      rerender(<Example pending={1} />);
      rerender(<Example pending={1} syncing />);
      rerender(<Example />);

      expect(announcement()).toBeEmptyDOMElement();
    });

    it("announces going offline, with what will happen to the changes", () => {
      const { rerender } = render(<Example pending={2} />);
      rerender(<Example pending={2} online={false} />);

      expect(announcement()).toHaveTextContent(
        "Offline. 2 changes will save when you're back online.",
      );
    });

    it("announces coming back, with what is being saved", () => {
      const { rerender } = render(<Example pending={2} online={false} />);
      rerender(<Example pending={2} syncing />);

      expect(announcement()).toHaveTextContent("Back online. Saving 2 changes.");
    });

    it("announces a failure and then the recovery", () => {
      const { rerender } = render(<Example pending={1} syncing />);
      rerender(<Example pending={1} error="Timed out." />);
      expect(announcement()).toHaveTextContent("Could not save 1 change. Timed out.");

      rerender(<Example pending={1} syncing />);
      rerender(<Example />);
      expect(announcement()).toHaveTextContent("Saved.");
    });

    it("can be silenced", () => {
      const { rerender } = render(<Example announce={false} />);
      rerender(<Example announce={false} online={false} />);

      expect(announcement()).toBeEmptyDOMElement();
      expect(announcement()).toHaveAttribute("aria-live", "off");
      expect(text()).toHaveTextContent("Offline");
    });
  });

  describe("retry", () => {
    it("is offered on failure and calls back", async () => {
      const onRetry = vi.fn();
      const user = userEvent.setup();
      render(<Example error="Timed out." onRetry={onRetry} />);

      await user.click(screen.getByRole("button", { name: "Retry" }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("is not offered while things are fine, nor without a handler", () => {
      const { rerender } = render(<Example onRetry={vi.fn()} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();

      rerender(<Example error="Timed out." />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  it("lets a className override win a conflict", () => {
    const { container } = render(<Example className="text-sm" />);
    const root = container.querySelector("[data-slot='sync-status']");
    expect(root).toHaveClass("text-sm");
    expect(root).not.toHaveClass("text-xs");
  });

  it("forwards a ref and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example ref={ref} data-testid="sync" />);
    expect(ref.current).toBe(screen.getByTestId("sync"));
  });

  it("has no accessibility violations in any state", async () => {
    const { container, rerender } = render(<Example />);
    await expectNoA11yViolations(container);

    rerender(<Example pending={3} online={false} />);
    await expectNoA11yViolations(container);

    rerender(<Example pending={3} error="Timed out." onRetry={vi.fn()} />);
    await expectNoA11yViolations(container);
  });
});
