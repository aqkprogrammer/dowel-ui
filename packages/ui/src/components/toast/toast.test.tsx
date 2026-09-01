import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { Toaster } from "./toast";
import { TOAST_LIMIT, resetToasts, toast } from "./toast-store";

afterEach(() => {
  act(() => {
    resetToasts();
  });
});

function raise(fn: () => void) {
  act(() => {
    fn();
  });
}

describe("toast store", () => {
  it("returns the id it created", () => {
    let id = "";
    raise(() => {
      id = toast("Saved");
    });
    expect(id).toMatch(/^toast-\d+$/);
  });

  it("honours an explicit id, replacing rather than duplicating", async () => {
    render(<Toaster />);

    raise(() => toast.custom({ id: "sync", title: "Syncing" }));
    expect(await screen.findByText("Syncing")).toBeInTheDocument();

    raise(() => toast.custom({ id: "sync", title: "Synced" }));
    await waitFor(() => {
      expect(screen.getByText("Synced")).toBeInTheDocument();
    });
    expect(screen.queryByText("Syncing")).not.toBeInTheDocument();
  });

  it("keeps only the most recent toasts", async () => {
    render(<Toaster />);

    raise(() => {
      for (let index = 0; index < TOAST_LIMIT + 3; index += 1) {
        toast(`Message ${String(index)}`);
      }
    });

    await waitFor(() => {
      expect(document.querySelectorAll("[data-slot='toast']")).toHaveLength(TOAST_LIMIT);
    });
    expect(screen.queryByText("Message 0")).not.toBeInTheDocument();
    expect(screen.getByText(`Message ${String(TOAST_LIMIT + 2)}`)).toBeInTheDocument();
  });

  it("calls onDismiss when a toast is removed", () => {
    const onDismiss = vi.fn();
    let id = "";
    raise(() => {
      id = toast.custom({ title: "Saved", onDismiss });
    });

    raise(() => {
      toast.dismiss(id);
    });
    expect(onDismiss).toHaveBeenCalledWith(id);
  });

  it("updates a toast in place", async () => {
    render(<Toaster />);

    let id = "";
    raise(() => {
      id = toast("Uploading");
    });
    await screen.findByText("Uploading");

    raise(() => {
      toast.update(id, { title: "Uploaded", variant: "success" });
    });

    await waitFor(() => {
      expect(screen.getByText("Uploaded")).toBeInTheDocument();
    });
    expect(document.querySelector("[data-slot='toast']")).toHaveClass("border-success/30");
  });

  it("exposes a helper per variant", async () => {
    render(<Toaster />);

    raise(() => {
      toast.default("Plain");
      toast.info("Informational");
    });

    expect(await screen.findByText("Plain")).toBeInTheDocument();
    expect(screen.getByText("Informational")).toBeInTheDocument();
  });

  it("dismisses everything at once", async () => {
    render(<Toaster />);

    raise(() => {
      toast("One");
      toast("Two");
    });
    await screen.findByText("One");

    raise(() => {
      toast.dismissAll();
    });
    await waitFor(() => {
      expect(screen.queryByText("One")).not.toBeInTheDocument();
    });
  });

  describe("promise", () => {
    it("resolves the pending toast into a success toast", async () => {
      render(<Toaster />);

      let resolve!: (value: string) => void;
      const pending = new Promise<string>((r) => {
        resolve = r;
      });

      raise(() => {
        void toast.promise(pending, {
          loading: "Saving…",
          success: (value) => `Saved ${value}`,
          error: "Failed",
        });
      });

      expect(await screen.findByText("Saving…")).toBeInTheDocument();

      await act(async () => {
        resolve("project");
        await pending;
      });

      await waitFor(() => {
        expect(screen.getByText("Saved project")).toBeInTheDocument();
      });
    });

    it("turns a rejection into an error toast and still rejects", async () => {
      render(<Toaster />);

      const failure = new Error("network");
      const pending = Promise.reject(failure);

      let returned!: Promise<never>;
      raise(() => {
        returned = toast.promise(pending, {
          loading: "Saving…",
          success: "Saved",
          error: (error) => `Failed: ${(error as Error).message}`,
        });
      });

      // The original promise is returned untouched, so callers still handle it.
      await expect(returned).rejects.toThrow("network");
      await waitFor(() => {
        expect(screen.getByText("Failed: network")).toBeInTheDocument();
      });
    });
  });
});

describe("Toaster", () => {
  it("renders nothing until a toast is raised", () => {
    render(<Toaster />);
    expect(document.querySelector("[data-slot='toast']")).not.toBeInTheDocument();
  });

  it("renders a title and description", async () => {
    render(<Toaster />);
    raise(() => toast("Project created", { description: "It is ready to use." }));

    expect(await screen.findByText("Project created")).toBeInTheDocument();
    expect(screen.getByText("It is ready to use.")).toBeInTheDocument();
  });

  it.each([
    ["success", "border-success/30"],
    ["warning", "border-warning/35"],
    ["destructive", "border-destructive/30"],
    ["info", "border-info/30"],
  ] as const)("applies the %s variant", async (variant, expectedClass) => {
    render(<Toaster />);
    raise(() => toast.custom({ title: "Message", variant }));
    await screen.findByText("Message");

    expect(document.querySelector("[data-slot='toast']")).toHaveClass(expectedClass);
  });

  it("interrupts for problems and waits for a pause otherwise", async () => {
    render(<Toaster />);

    raise(() => toast.error("Payment failed"));
    const problem = await screen.findByText("Payment failed");
    expect(problem.closest("[data-slot='toast']")).toHaveAttribute("data-type", "foreground");

    raise(() => toast.success("Saved"));
    const routine = await screen.findByText("Saved");
    expect(routine.closest("[data-slot='toast']")).toHaveAttribute("data-type", "background");
  });

  it("announces a problem assertively through a live region", async () => {
    render(<Toaster />);
    raise(() => toast.error("Payment failed"));

    const announcement = await screen.findByRole("status");
    expect(announcement).toHaveAttribute("aria-live", "assertive");
    // The primitive mounts the region first and fills it on a later tick.
    await waitFor(() => {
      expect(announcement).toHaveTextContent("Payment failed");
    });
  });

  it("dismisses from the close button", async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    raise(() => toast("Saved"));
    await screen.findByText("Saved");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => {
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });
  });

  it("runs an action and exposes alt text for screen readers", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Toaster />);

    raise(() =>
      toast.custom({
        title: "Message archived",
        action: { label: "Undo", altText: "Undo archiving the message", onClick },
      }),
    );

    const action = await screen.findByRole("button", { name: "Undo" });
    // The primitive announces the alt text in place of the visible label, since
    // "Undo" alone is meaningless once the toast is gone.
    expect(action).toHaveAttribute(
      "data-radix-toast-announce-alt",
      "Undo archiving the message",
    );
    const announcement = await screen.findByRole("status");
    await waitFor(() => {
      expect(announcement).toHaveTextContent("Undo archiving the message");
    });

    await user.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("falls back to the action label for alt text", async () => {
    render(<Toaster />);
    raise(() =>
      toast.custom({
        title: "Message archived",
        action: { label: "Undo", onClick: () => undefined },
      }),
    );

    expect(await screen.findByRole("button", { name: "Undo" })).toHaveAttribute(
      "data-radix-toast-announce-alt",
      "Undo",
    );
  });

  it.each([
    ["top-left", "top-0"],
    ["bottom-right", "bottom-0"],
    ["bottom-center", "left-1/2"],
  ] as const)("positions the viewport for %s", async (position, expectedClass) => {
    const { baseElement } = render(<Toaster position={position} />);
    raise(() => toast("Message"));
    await screen.findByText("Message");

    expect(baseElement.querySelector("[data-slot='toast-viewport']")).toHaveClass(
      expectedClass,
    );
  });

  it("has no accessibility violations", async () => {
    const { baseElement } = render(<Toaster />);
    raise(() =>
      toast.custom({
        title: "Project created",
        description: "It is ready to use.",
        action: { label: "View", onClick: () => undefined },
      }),
    );
    await screen.findByText("Project created");

    await expectNoA11yViolations(baseElement);
  });
});
