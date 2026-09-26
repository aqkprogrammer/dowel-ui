import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  ProvenanceInline,
  ProvenanceLegend,
  ProvenanceText,
  type ProvenanceAuthors,
  type ProvenanceSegment,
} from "./provenance-text";

const AUTHORS: ProvenanceAuthors = {
  you: { label: "You", kind: "person" },
  claude: { label: "Claude", kind: "agent" },
  wikipedia: {
    label: "Wikipedia",
    kind: "source",
    href: "https://en.wikipedia.org/wiki/Photosynthesis",
  },
};

const SEGMENTS: ProvenanceSegment[] = [
  { text: "Plants make their own food. ", author: "you" },
  { text: "They turn light, water and carbon dioxide into sugar", author: "claude" },
  { text: ", which is what ", author: "you" },
  { text: "“photosynthesis”", author: "wikipedia" },
  { text: " means.", author: "you" },
];

const PLAIN =
  "Plants make their own food. They turn light, water and carbon dioxide into sugar, which is what “photosynthesis” means.";

const body = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot='provenance-text-body']");
const marks = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>("[data-slot='provenance-mark']"),
];

describe("ProvenanceText", () => {
  it("reads as plain text until provenance is shown", () => {
    const { container } = render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    expect(screen.getByRole("button", { name: "Show who wrote what" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(body(container)?.tagName).toBe("P");
    expect(body(container)?.textContent).toBe(PLAIN);
    expect(container.querySelector(".sr-only")).toBeNull();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("says who wrote each marked part once shown", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    const toggle = screen.getByRole("button", { name: "Show who wrote what" });
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(container.firstElementChild).toHaveAttribute("data-state", "shown");
    expect(body(container)?.textContent).toBe(
      "Plants make their own food. Claude wrote: They turn light, water and carbon dioxide into sugar End of Claude's text. " +
        ", which is what Quoted from Wikipedia: “photosynthesis” End quote.  means.",
    );
    expect(marks(container).map((mark) => mark.dataset.kind)).toEqual(["agent", "source"]);
    expect(marks(container).map((mark) => mark.dataset.author)).toEqual([
      "claude",
      "wikipedia",
    ]);
  });

  it("points the toggle at the text it changes", () => {
    const { container } = render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-controls", body(container)?.id);
  });

  it("lists each author with their kind and share, largest first", async () => {
    const user = userEvent.setup();
    render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    await user.click(screen.getByRole("button"));

    const legend = screen.getByRole("list", { name: "Who wrote this" });
    const items = [...legend.querySelectorAll("li")];
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Claude (agent) 43%");
    expect(items[1]).toHaveTextContent("You (person) 41%");
    expect(items[2]).toHaveTextContent("Wikipedia (source) 16%");
  });

  it("links a source's words to it only while shown", async () => {
    const user = userEvent.setup();
    render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("link", { name: "“photosynthesis”" })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Photosynthesis",
    );
    expect(screen.getByRole("link", { name: "Wikipedia" })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Photosynthesis",
    );
  });

  it("tells agent and source apart by underline shape, not only colour", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    await user.click(screen.getByRole("button"));
    const [agent, source] = marks(container);
    expect(agent).toHaveClass("underline", "decoration-2");
    expect(agent).not.toHaveClass("decoration-dashed");
    expect(source).toHaveClass("underline", "decoration-dashed");
  });

  it("hides it again, back to plain text", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    const toggle = screen.getByRole("button");
    await user.click(toggle);
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(body(container)?.textContent).toBe(PLAIN);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    for (const mark of marks(container)) {
      expect(mark).toHaveAttribute("data-state", "hidden");
      expect(mark).not.toHaveClass("underline");
    }
  });

  it("toggles from the keyboard", async () => {
    const user = userEvent.setup();
    render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    await user.tab();
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveFocus();
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("adds a tab stop only where there is a link", async () => {
    const user = userEvent.setup();
    render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} defaultShow />);
    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Wikipedia" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "“photosynthesis”" })).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("starts shown with defaultShow", () => {
    render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} defaultShow />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("follows show when controlled, and reports what was asked", async () => {
    const user = userEvent.setup();
    const onShowChange = vi.fn();
    const { rerender } = render(
      <ProvenanceText
        segments={SEGMENTS}
        authors={AUTHORS}
        show={false}
        onShowChange={onShowChange}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onShowChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");

    rerender(
      <ProvenanceText segments={SEGMENTS} authors={AUTHORS} show onShowChange={onShowChange} />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button"));
    expect(onShowChange).toHaveBeenLastCalledWith(false);
  });

  it("reports changes when uncontrolled too", async () => {
    const user = userEvent.setup();
    const onShowChange = vi.fn();
    render(
      <ProvenanceText segments={SEGMENTS} authors={AUTHORS} onShowChange={onShowChange} />,
    );
    await user.click(screen.getByRole("button"));
    expect(onShowChange).toHaveBeenCalledWith(true);
  });

  it("keeps whitespace at either end outside the mark", () => {
    const { container } = render(
      <ProvenanceText
        defaultShow
        authors={AUTHORS}
        segments={[
          { text: "Hi", author: "you" },
          { text: " there ", author: "claude" },
          { text: "friend", author: "you" },
        ]}
      />,
    );
    const [mark] = marks(container);
    expect(mark?.childNodes[1]?.textContent).toBe("there");
    expect(mark?.previousSibling?.textContent).toBe(" ");
    expect(mark?.nextSibling?.textContent).toBe(" ");
  });

  it("marks neighbouring segments by one author once", () => {
    const { container } = render(
      <ProvenanceText
        defaultShow
        authors={AUTHORS}
        segments={[
          { text: "One ", author: "claude" },
          { text: "", author: "you" },
          { text: "two.", author: "claude" },
        ]}
      />,
    );
    expect(marks(container)).toHaveLength(1);
    expect(body(container)?.textContent).toBe("Claude wrote: One two. End of Claude's text. ");
  });

  it("leaves whitespace-only and unknown authors' text unmarked", () => {
    const { container } = render(
      <ProvenanceText
        defaultShow
        authors={AUTHORS}
        segments={[
          { text: "Kept", author: "you" },
          { text: "  ", author: "claude" },
          { text: "as is.", author: "unknown" },
        ]}
      />,
    );
    expect(marks(container)).toHaveLength(0);
    expect(body(container)?.textContent).toBe("Kept  as is.");
    expect(screen.getByRole("list")).toHaveTextContent("unknown (person)");
  });

  it("takes a toggle label", () => {
    render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} toggleLabel="Authorship" />);
    expect(screen.getByRole("button", { name: "Authorship" })).toBeInTheDocument();
  });

  it("lets className override its own utilities", () => {
    const { container } = render(
      <ProvenanceText segments={SEGMENTS} authors={AUTHORS} className="gap-4" />,
    );
    expect(container.firstElementChild).toHaveClass("gap-4");
    expect(container.firstElementChild).not.toHaveClass("gap-2");
  });

  it("forwards ref and native props", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ProvenanceText
        ref={ref}
        segments={SEGMENTS}
        authors={AUTHORS}
        data-testid="provenance"
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("provenance"));
    expect(ref.current).toHaveAttribute("data-slot", "provenance-text");
  });

  it("has no detectable accessibility violations, hidden or shown", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProvenanceText segments={SEGMENTS} authors={AUTHORS} />);
    await expectNoA11yViolations(container);
    await user.click(screen.getByRole("button"));
    await expectNoA11yViolations(container);
  });
});

describe("ProvenanceLegend", () => {
  it("is a named list that takes another name", () => {
    render(
      <ProvenanceLegend
        segments={SEGMENTS}
        authors={AUTHORS}
        aria-label="Authors of this answer"
      />,
    );
    expect(screen.getByRole("list", { name: "Authors of this answer" })).toBeInTheDocument();
  });

  it("renders nothing when nothing was written", () => {
    const { container } = render(<ProvenanceLegend segments={[]} authors={AUTHORS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a sample of each mark to the eye only", () => {
    render(<ProvenanceLegend segments={SEGMENTS} authors={AUTHORS} />);
    const samples = [...screen.getByRole("list").querySelectorAll("[aria-hidden='true']")];
    expect(samples.map((sample) => sample.textContent)).toEqual(["Abc", "Abc", "Abc"]);
  });

  it("lets className override and forwards ref", () => {
    const ref = createRef<HTMLUListElement>();
    render(
      <ProvenanceLegend ref={ref} segments={SEGMENTS} authors={AUTHORS} className="gap-x-8" />,
    );
    expect(ref.current).toBe(screen.getByRole("list"));
    expect(ref.current).toHaveClass("gap-x-8");
    expect(ref.current).not.toHaveClass("gap-x-4");
  });
});

describe("ProvenanceInline", () => {
  it("marks who wrote what by default, as a span", () => {
    const { container } = render(<ProvenanceInline segments={SEGMENTS} authors={AUTHORS} />);
    expect(container.firstElementChild?.tagName).toBe("SPAN");
    expect(marks(container).every((mark) => mark.dataset.state === "shown")).toBe(true);
    expect(container).toHaveTextContent("Claude wrote:");
  });

  it("is plain text when not shown", () => {
    const { container } = render(
      <ProvenanceInline segments={SEGMENTS} authors={AUTHORS} show={false} />,
    );
    expect(container.textContent).toBe(PLAIN);
  });

  it("lets className override, forwards ref and has no violations", async () => {
    const ref = createRef<HTMLSpanElement>();
    const { container } = render(
      <p>
        <ProvenanceInline
          ref={ref}
          segments={SEGMENTS}
          authors={AUTHORS}
          className="whitespace-normal"
        />
      </p>,
    );
    expect(ref.current).toHaveClass("whitespace-normal");
    expect(ref.current).not.toHaveClass("whitespace-pre-wrap");
    await expectNoA11yViolations(container);
  });
});
