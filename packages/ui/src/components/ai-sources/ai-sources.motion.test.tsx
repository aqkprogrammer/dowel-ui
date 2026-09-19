import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  InlineCitation,
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
  sourceHost,
} from "./ai-sources";

afterEach(() => {
  vi.restoreAllMocks();
});

function Icon({ name }: { name: string }) {
  return <img alt="" src={`data:image/gif;base64,R0lGODlhAQABAAAAACw=`} data-name={name} />;
}

describe("sourceHost", () => {
  it("strips www. from a URL's hostname", () => {
    expect(sourceHost("https://www.a.example/x?y=1")).toBe("a.example");
    expect(sourceHost("https://docs.b.example/page")).toBe("docs.b.example");
  });

  it("returns the input when it is not a URL", () => {
    expect(sourceHost("#1")).toBe("#1");
    expect(sourceHost("report.pdf")).toBe("report.pdf");
  });

  it("returns the input for a URL with no host", () => {
    expect(sourceHost("mailto:someone@example.org")).toBe("mailto:someone@example.org");
  });
});

describe("SourcesTrigger favicon stack", () => {
  it("shows at most stackLimit marks, then a +n chip", () => {
    const { container } = render(
      <Sources>
        <SourcesTrigger
          count={5}
          favicons={["a", "b", "c", "d", "e"].map((name) => (
            <Icon key={name} name={name} />
          ))}
        />
      </Sources>,
    );
    expect(container.querySelectorAll("[data-slot='sources-stack-mark']")).toHaveLength(3);
    expect(container.querySelector("[data-slot='sources-stack-overflow']")).toHaveTextContent(
      "+2",
    );
  });

  it("has no chip when everything fits, and honours a custom limit", () => {
    const { container, rerender } = render(
      <Sources>
        <SourcesTrigger count={2} favicons={[<Icon key="a" name="a" />, null]} />
      </Sources>,
    );
    expect(container.querySelectorAll("[data-slot='sources-stack-mark']")).toHaveLength(2);
    expect(container.querySelector("[data-slot='sources-stack-overflow']")).toBeNull();
    // A missing favicon falls back to a neutral globe.
    expect(container.querySelectorAll("[data-slot='sources-stack-mark'] svg")).toHaveLength(1);

    rerender(
      <Sources>
        <SourcesTrigger count={4} stackLimit={1} favicons={[null, null, null, null]} />
      </Sources>,
    );
    expect(container.querySelectorAll("[data-slot='sources-stack-mark']")).toHaveLength(1);
    expect(container.querySelector("[data-slot='sources-stack-overflow']")).toHaveTextContent(
      "+3",
    );
  });

  it("stacks the first mark on top and overlaps the rest", () => {
    const { container } = render(
      <Sources>
        <SourcesTrigger count={3} favicons={[null, null, null]} />
      </Sources>,
    );
    const marks = [
      ...container.querySelectorAll<HTMLElement>("[data-slot='sources-stack-mark']"),
    ];
    expect(marks.map((mark) => mark.style.zIndex)).toEqual(["3", "2", "1"]);
    expect(marks[0]).not.toHaveClass("-ms-2");
    expect(marks[1]).toHaveClass(
      "-ms-2",
      "group-hover/trigger:group-data-[state=closed]/trigger:ms-0.5",
    );
  });

  it("is hidden from assistive technology; the name is still the count in words", () => {
    const { container } = render(
      <Sources>
        <SourcesTrigger count={4} favicons={[null, null, null, null]} />
      </Sources>,
    );
    expect(container.querySelector("[data-slot='sources-stack']")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("4 sources");
  });

  it("renders no stack by default", () => {
    const { container } = render(
      <Sources>
        <SourcesTrigger count={2} favicons={[]} />
      </Sources>,
    );
    expect(container.querySelector("[data-slot='sources-stack']")).toBeNull();
  });
});

describe("Source rows", () => {
  it("renders a favicon before the title and keeps the index badge", async () => {
    const user = userEvent.setup();
    render(
      <Sources>
        <SourcesTrigger count={1} />
        <SourcesContent>
          <Source index={1} title="Paris" href="#1" favicon={<Icon name="paris" />} />
        </SourcesContent>
      </Sources>,
    );
    await user.click(screen.getByRole("button", { name: "1 source" }));

    const link = await screen.findByRole("link");
    expect(link.querySelector("img[data-name='paris']")).not.toBeNull();
    expect(link.querySelector("[aria-hidden='true']")).toHaveTextContent("1");
    expect(link).toHaveAccessibleName("Paris");
  });

  it("carries a stagger index on each item, capped", () => {
    render(
      <Sources defaultOpen>
        <SourcesTrigger count={14} />
        <SourcesContent>
          {Array.from({ length: 14 }, (_, position) => (
            <Source key={position} index={position + 1} title={`Source ${String(position)}`} />
          ))}
        </SourcesContent>
      </Sources>,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]?.style.getPropertyValue("--dowel-i")).toBe("0");
    expect(items[3]?.style.getPropertyValue("--dowel-i")).toBe("3");
    expect(items[13]?.style.getPropertyValue("--dowel-i")).toBe("10");

    const sheet = document.querySelector("style[data-href='dowel-ai-sources']")?.textContent;
    expect(sheet).toContain("[data-slot=sources-content][data-state=open] [data-slot=source]");
    expect(sheet).toContain("var(--motion-scale");
  });

  it("stays an ordered list and passes axe with favicons", async () => {
    const { container } = render(
      <Sources defaultOpen>
        <SourcesTrigger count={2} favicons={[<Icon key="a" name="a" />, null]} />
        <SourcesContent>
          <Source
            index={1}
            title="One"
            origin={sourceHost("https://www.one.example/a")}
            href="#1"
            favicon={<Icon name="a" />}
          />
          <Source index={2} title="Two" href="#2" />
        </SourcesContent>
      </Sources>,
    );
    expect(screen.getByRole("list").tagName).toBe("OL");
    expect(screen.getByText("one.example")).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});

describe("InlineCitation preview", () => {
  function Cited(props: { description?: string; href?: string }) {
    return (
      <p>
        Paris is the capital
        <InlineCitation
          index={1}
          title="Paris — overview"
          href={"href" in props ? props.href : "https://www.encyclopedia.example/paris"}
          description={props.description ?? "The capital and most populous city of France."}
          preview
        />
        .
      </p>
    );
  }

  it("renders exactly today's markup when preview is off", () => {
    const { container } = render(<InlineCitation index={1} title="T" href="#1" />);
    const link = screen.getByRole("link", { name: "Source 1: T" });
    expect(link).not.toHaveAttribute("aria-describedby");
    expect(link).not.toHaveAttribute("data-state");
    expect(container.children).toHaveLength(1);
  });

  it("opens on keyboard focus, with a description that exists", async () => {
    const user = userEvent.setup();
    render(<Cited />);
    const link = screen.getByRole("link", { name: "Source 1: Paris — overview" });
    expect(link).not.toHaveAttribute("aria-describedby");

    await user.tab();
    expect(link).toHaveFocus();

    const tooltip = await screen.findByRole("tooltip");
    expect(link.getAttribute("aria-describedby")).toBe(tooltip.id);
    expect(tooltip).toHaveTextContent("encyclopedia.example");
    expect(tooltip).toHaveTextContent("The capital and most populous city of France.");
    expect(tooltip).not.toHaveTextContent("Paris — overview");
    // The name is unchanged.
    expect(link).toHaveAccessibleName("Source 1: Paris — overview");
  });

  it("shows the host, not the URL, in the card", async () => {
    const user = userEvent.setup();
    render(<Cited />);
    await user.tab();
    await screen.findByRole("tooltip");
    const card = document.querySelector("[data-slot='inline-citation-preview']");
    expect(card).toHaveTextContent("encyclopedia.example");
    expect(card).not.toHaveTextContent("https://");
    expect(card).toHaveTextContent("Paris — overview");
  });

  it("opens on pointer hover", async () => {
    const user = userEvent.setup();
    render(<Cited />);
    await user.hover(screen.getByRole("link"));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });

  it("closes on Escape and keeps focus on the citation", async () => {
    const user = userEvent.setup();
    render(<Cited />);
    await user.tab();
    await screen.findByRole("tooltip");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
    const link = screen.getByRole("link");
    expect(link).toHaveFocus();
    expect(link).not.toHaveAttribute("aria-describedby");
  });

  it("describes with the host alone when there is no description", async () => {
    const user = userEvent.setup();
    render(<InlineCitation index={2} title="Docs" href="https://docs.example/a" preview />);
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(/^docs\.example$/);
  });

  it("gives two citations of one URL distinct description ids", async () => {
    render(
      <p>
        <InlineCitation index={1} title="A" href="https://same.example" preview />
        <InlineCitation index={2} title="B" href="https://same.example" preview />
      </p>,
    );
    const [first, second] = screen.getAllByRole("link");
    if (!first || !second) throw new Error("missing links");

    fireEvent.focus(first);
    const firstId = (await screen.findByRole("tooltip")).id;
    fireEvent.blur(first);
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    fireEvent.focus(second);
    const secondId = (await screen.findByRole("tooltip")).id;
    expect(firstId).not.toBe(secondId);
    expect(secondId).not.toMatch(/[:/]{2}/);
  });

  it("renders no preview without an href, and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render(<InlineCitation index={3} title="Internal" preview />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`preview` needs an `href`"));
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Source 3: Internal")).toBeInTheDocument();
    await userEvent.setup().tab();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("has no accessibility violations while open", async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Cited />);
    await user.tab();
    await screen.findByRole("tooltip");
    await expectNoA11yViolations(baseElement);
  });
});
