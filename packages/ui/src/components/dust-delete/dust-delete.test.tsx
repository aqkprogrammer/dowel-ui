import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DustDelete, type DustDeleteHandle } from "./dust-delete";

function root() {
  return document.querySelector<HTMLElement>('[data-slot="dust-delete"]')!;
}

describe("DustDelete", () => {
  it("renders its content untouched until deleted", () => {
    render(
      <DustDelete>
        <p>Quarterly report</p>
      </DustDelete>,
    );
    expect(screen.getByText("Quarterly report")).toBeVisible();
    expect(root()).toHaveAttribute("data-state", "idle");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("announces the deletion, then calls onDeleted and hides", async () => {
    const onDeleted = vi.fn();
    const { rerender } = render(
      <DustDelete onDeleted={onDeleted}>
        <p>Quarterly report</p>
      </DustDelete>,
    );
    rerender(
      <DustDelete deleted onDeleted={onDeleted} announcement="Report deleted">
        <p>Quarterly report</p>
      </DustDelete>,
    );

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });
    expect(root()).toHaveAttribute("data-state", "gone");
    expect(root()).toHaveAttribute("hidden");
  });

  it("makes the item inert while it goes", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    // jsdom has no Web Animations; stand in one whose animations finish on cue.
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const original = proto.animate;
    proto.animate = vi.fn(() => ({ finished: gate }));

    const handle = createRef<DustDeleteHandle>();
    render(
      <DustDelete actionRef={handle} announcement="Report deleted">
        <button type="button">Open</button>
      </DustDelete>,
    );
    let done!: Promise<void>;
    act(() => {
      done = handle.current!.disintegrate();
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Report deleted");
    });
    expect(document.querySelector('[data-slot="dust-delete-content"]')).toHaveAttribute(
      "inert",
    );

    release();
    await act(async () => {
      await done;
    });
    proto.animate = original;
  });

  it("draws the dust from visible copies of the hidden item", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
    const original = proto.animate;
    proto.animate = vi.fn(() => ({ finished: gate }));
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue(DOMRect.fromRect({ width: 120, height: 40 }));

    try {
      const handle = createRef<DustDeleteHandle>();
      render(
        <DustDelete actionRef={handle}>
          <p>Quarterly report</p>
        </DustDelete>,
      );
      let done!: Promise<void>;
      act(() => {
        done = handle.current!.disintegrate();
      });

      await waitFor(() => {
        expect(
          document.querySelectorAll(
            '[data-slot="dust-delete-dust"] [data-slot="dust-delete-content"]',
          ).length,
        ).toBeGreaterThan(0);
      });
      const content = document.querySelector<HTMLElement>(
        '[data-slot="dust-delete"] > [data-slot="dust-delete-content"]',
      )!;
      expect(content.style.visibility).toBe("hidden");
      for (const copy of document.querySelectorAll<HTMLElement>(
        '[data-slot="dust-delete-dust"] [data-slot="dust-delete-content"]',
      )) {
        expect(copy.style.visibility).toBe("visible");
      }

      release();
      await act(async () => {
        await done;
      });
    } finally {
      rect.mockRestore();
      proto.animate = original;
    }
  });

  it("runs once however often it is asked", async () => {
    const onDeleted = vi.fn();
    const handle = createRef<DustDeleteHandle>();
    render(
      <DustDelete actionRef={handle} onDeleted={onDeleted}>
        <p>Row</p>
      </DustDelete>,
    );
    await act(async () => {
      await Promise.all([handle.current!.disintegrate(), handle.current!.disintegrate()]);
    });
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("removes cleanly from a list in onDeleted", async () => {
    function List() {
      const [items, setItems] = useState(["One", "Two"]);
      const [gone, setGone] = useState<string | null>(null);
      return (
        <ul>
          {items.map((item) => (
            <li key={item}>
              <DustDelete
                deleted={gone === item}
                onDeleted={() => setItems((current) => current.filter((x) => x !== item))}
              >
                <button type="button" onClick={() => setGone(item)}>
                  Delete {item}
                </button>
              </DustDelete>
            </li>
          ))}
        </ul>
      );
    }
    render(<List />);
    act(() => {
      screen.getByRole("button", { name: "Delete One" }).click();
    });
    await waitFor(() => {
      expect(screen.queryByText("Delete One")).toBeNull();
    });
    expect(screen.getByRole("button", { name: "Delete Two" })).toBeInTheDocument();
  });

  it("keeps the dust layer out of the accessibility tree", () => {
    render(
      <DustDelete>
        <p>Row</p>
      </DustDelete>,
    );
    expect(document.querySelector('[data-slot="dust-delete-dust"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <DustDelete>
        <p>Row</p>
      </DustDelete>,
    );
    await expectNoA11yViolations(container);
  });
});
