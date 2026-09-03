import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { SecretField, maskSecret, type SecretFieldProps } from "./secret-field";

const KEY = "sk_live_EXAMPLE_not_a_real_key_0000";

function Example(props: Partial<SecretFieldProps> = {}) {
  return <SecretField label="Live secret key" value={KEY} {...props} />;
}

const field = () => screen.getByLabelText("Live secret key");
const button = (name: string) => screen.getByRole("button", { name });

/** Replaces the clipboard, which jsdom does not have and user-event only stubs. */
function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("maskSecret", () => {
  it("keeps the prefix through the last underscore and the last four", () => {
    expect(maskSecret(KEY)).toBe("sk_live_…0000");
    expect(maskSecret("ghp_16C7e42F292c6912E7710c838347Ae178B4a")).toBe("ghp_…8B4a");
    expect(maskSecret("whsec_9c1f2a3b4c5d6e7f8a9b0c1d2e3f")).toBe("whsec_…2e3f");
  });

  it("keeps four characters when there is no prefix", () => {
    expect(maskSecret("4eC39HqLyjWDarjtT1zdp7dcXYZ")).toBe("4eC3…cXYZ");
  });

  it("never shows enough of a short secret to reconstruct it", () => {
    expect(maskSecret("sk_live_abcd")).toBe("…abcd");
    expect(maskSecret("abc")).toBe("••••••••");
  });
});

describe("SecretField", () => {
  describe("shown once", () => {
    it("shows the value, says it is the only time, and offers to confirm it was saved", () => {
      const onAcknowledge = vi.fn();
      render(<Example once onAcknowledge={onAcknowledge} />);

      expect(field()).toHaveValue(KEY);
      expect(field()).toHaveAccessibleDescription(/Shown once\. Copy it now/);
      expect(button("I have saved it")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Reveal/ })).not.toBeInTheDocument();
    });

    it("reports the acknowledgement rather than hiding the value itself", async () => {
      const onAcknowledge = vi.fn();
      const user = userEvent.setup();
      render(<Example once onAcknowledge={onAcknowledge} />);

      await user.click(button("I have saved it"));

      expect(onAcknowledge).toHaveBeenCalledTimes(1);
      expect(field()).toHaveValue(KEY);
    });

    it("selects the whole value on focus, so it can be copied by hand", async () => {
      const user = userEvent.setup();
      render(<Example once />);

      await user.click(field());

      const input = field() as HTMLInputElement;
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(KEY.length);
    });
  });

  describe("hidden and revealable", () => {
    it("starts hidden with the preview in the field and the secret out of the DOM", () => {
      const { container } = render(<Example />);

      expect(field()).toHaveValue("sk_live_…0000");
      expect(container.innerHTML).not.toContain(KEY);
      expect(field()).toHaveAccessibleDescription(/Hidden\. Copy works without revealing it/);
    });

    it("reveals and hides, reporting each so it can be logged", async () => {
      const onRevealChange = vi.fn();
      const user = userEvent.setup();
      render(<Example onRevealChange={onRevealChange} />);

      await user.click(button("Reveal — Live secret key"));
      expect(field()).toHaveValue(KEY);
      expect(button("Hide — Live secret key")).toHaveAttribute("aria-pressed", "true");
      expect(onRevealChange).toHaveBeenLastCalledWith(true);

      await user.click(button("Hide — Live secret key"));
      expect(field()).toHaveValue("sk_live_…0000");
      expect(onRevealChange).toHaveBeenLastCalledWith(false);
    });

    it("uses a supplied preview over the derived one", () => {
      render(<Example preview="live key ending 7dc" />);
      expect(field()).toHaveValue("live key ending 7dc");
    });

    it("copies the real value while hidden", async () => {
      // user-event installs its own clipboard in setup, so the stub goes after.
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubClipboard(writeText);
      render(<Example />);

      await user.click(button("Copy — Live secret key"));

      expect(writeText).toHaveBeenCalledWith(KEY);
    });
  });

  describe("gone", () => {
    it("shows the preview, says it cannot be shown, and offers neither copy nor reveal", () => {
      const { container } = render(<Example value={undefined} preview="sk_live_…0000" />);

      expect(field()).toHaveValue("sk_live_…0000");
      expect(field()).toHaveAccessibleDescription("Cannot be shown again.");
      expect(screen.queryByRole("button", { name: /Copy/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Reveal/ })).not.toBeInTheDocument();
      expect(container.querySelector("[data-slot='secret-field']")).toHaveAttribute(
        "data-state",
        "gone",
      );
    });

    it("falls back to dots without a preview", () => {
      render(<Example value={undefined} />);
      expect(field()).toHaveValue("••••••••");
    });
  });

  describe("copying", () => {
    it("announces success", async () => {
      const user = userEvent.setup();
      stubClipboard(vi.fn().mockResolvedValue(undefined));
      render(<Example once />);

      await user.click(button("Copy — Live secret key"));

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("Copied to the clipboard");
      });
      expect(button("Copy — Live secret key")).toHaveTextContent("Copied");
    });

    it("announces failure and says what to do instead", async () => {
      const user = userEvent.setup();
      stubClipboard(vi.fn().mockRejectedValue(new Error("refused")));
      render(<Example once />);

      await user.click(button("Copy — Live secret key"));

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(/Could not copy/);
      });
      // Said twice on purpose: once for the status region, once on screen.
      expect(screen.getAllByText(/Select the value and copy it by hand/)).toHaveLength(2);
      expect(document.querySelector("[data-slot='secret-field-copy-error']")).toBeVisible();
    });

    it("treats a missing clipboard as a failure rather than throwing", async () => {
      const user = userEvent.setup();
      Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
      render(<Example once />);

      await user.click(button("Copy — Live secret key"));

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(/Could not copy/);
      });
    });

    it("has its status region in place before anything is copied", () => {
      render(<Example once />);
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("clears the confirmation after a moment", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      stubClipboard(vi.fn().mockResolvedValue(undefined));
      render(<Example once />);

      await user.click(button("Copy — Live secret key"));
      await waitFor(() => {
        expect(button("Copy — Live secret key")).toHaveTextContent("Copied");
      });

      vi.advanceTimersByTime(2100);
      await waitFor(() => {
        expect(button("Copy — Live secret key")).toHaveTextContent("Copy");
      });
      vi.useRealTimers();
    });
  });

  describe("regenerating", () => {
    it("asks first, with the consequence stated", async () => {
      const onRegenerate = vi.fn();
      const user = userEvent.setup();
      render(<Example value={undefined} onRegenerate={onRegenerate} />);

      await user.click(button("Regenerate — Live secret key"));

      expect(onRegenerate).not.toHaveBeenCalled();
      expect(
        screen.getByRole("group", { name: /revokes this one immediately/ }),
      ).toBeInTheDocument();

      await user.click(button("Regenerate"));
      expect(onRegenerate).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
    });

    it("can be cancelled", async () => {
      const onRegenerate = vi.fn();
      const user = userEvent.setup();
      render(<Example value={undefined} onRegenerate={onRegenerate} />);

      await user.click(button("Regenerate — Live secret key"));
      await user.click(button("Cancel"));

      expect(onRegenerate).not.toHaveBeenCalled();
      expect(button("Regenerate — Live secret key")).toBeInTheDocument();
    });

    it("takes a custom warning", async () => {
      const user = userEvent.setup();
      render(
        <Example
          value={undefined}
          onRegenerate={vi.fn()}
          regenerateWarning="Webhooks signed with the old secret will fail."
        />,
      );

      await user.click(button("Regenerate — Live secret key"));
      expect(
        screen.getByText("Webhooks signed with the old secret will fail."),
      ).toBeInTheDocument();
    });

    it("is not offered without a handler", () => {
      render(<Example value={undefined} />);
      expect(screen.queryByRole("button", { name: /Regenerate/ })).not.toBeInTheDocument();
    });
  });

  it("renders metadata as children", () => {
    render(
      <Example>
        <p>Created 3 September 2026 · last used 2 minutes ago</p>
      </Example>,
    );
    expect(screen.getByText(/last used 2 minutes ago/)).toBeInTheDocument();
  });

  it("names every button with the field, so a page of keys is a page of different buttons", () => {
    render(
      <>
        <SecretField label="Live key" value={KEY} onRegenerate={vi.fn()} />
        <SecretField label="Test key" value={KEY} onRegenerate={vi.fn()} />
      </>,
    );

    expect(screen.getByRole("button", { name: "Copy — Live key" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy — Test key" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Regenerate — Test key" })).toBeInTheDocument();
  });

  it("lets a className override win a conflict", () => {
    const { container } = render(<Example className="gap-6" />);
    const root = container.querySelector("[data-slot='secret-field']");
    expect(root).toHaveClass("gap-6");
    expect(root).not.toHaveClass("gap-2");
  });

  it("forwards a ref and native attributes", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Example ref={ref} data-testid="secret" />);
    expect(ref.current).toBe(screen.getByTestId("secret"));
  });

  it("has no accessibility violations shown once", async () => {
    const { container } = render(<Example once onAcknowledge={vi.fn()} />);
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations hidden, with regenerate offered", async () => {
    const { container } = render(<Example onRegenerate={vi.fn()} />);
    await expectNoA11yViolations(container);
  });

  it("has no accessibility violations while confirming a regeneration", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example value={undefined} onRegenerate={vi.fn()} />);
    await user.click(button("Regenerate — Live secret key"));
    await expectNoA11yViolations(container);
  });
});
