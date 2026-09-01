import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { InlineCitation, Source, Sources, SourcesContent, SourcesTrigger } from "./ai-sources";

describe("InlineCitation", () => {
  it("carries the source title in its accessible name", () => {
    render(<InlineCitation index={1} title="Encyclopaedia entry on France" href="#1" />);
    // The visible text is a bare number, which conveys nothing on its own.
    expect(
      screen.getByRole("link", { name: "Source 1: Encyclopaedia entry on France" }),
    ).toBeInTheDocument();
  });

  it("renders as text, not a dead link, without an href", () => {
    render(<InlineCitation index={2} title="Internal document" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Source 2: Internal document")).toBeInTheDocument();
  });

  it("shows the marker number visually", () => {
    const { container } = render(<InlineCitation index={3} title="A source" />);
    expect(container.querySelector("[aria-hidden='true']")).toHaveTextContent("3");
  });
});

describe("Sources", () => {
  function Example() {
    return (
      <Sources>
        <SourcesTrigger count={2} />
        <SourcesContent>
          <Source index={1} title="Paris — overview" origin="example.org" href="#1" />
          <Source
            index={2}
            title="France factbook"
            origin="factbook.example"
            excerpt="Paris is the capital and most populous city."
            href="#2"
          />
        </SourcesContent>
      </Sources>
    );
  }

  it("is collapsed by default", () => {
    render(<Example />);
    expect(screen.getByRole("button", { name: "2 sources" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("pluralises the count", () => {
    render(
      <Sources>
        <SourcesTrigger count={1} />
        <SourcesContent>
          <Source index={1} title="Only one" href="#1" />
        </SourcesContent>
      </Sources>,
    );
    expect(screen.getByRole("button", { name: "1 source" })).toBeInTheDocument();
  });

  it("lists the sources in order, matching the marker numbers", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "2 sources" }));

    const list = await screen.findByRole("list");
    expect(list.tagName).toBe("OL");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows origin and excerpt when given", async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole("button", { name: "2 sources" }));
    expect(await screen.findByText("factbook.example")).toBeInTheDocument();
    expect(
      screen.getByText(/Paris is the capital and most populous city\./),
    ).toBeInTheDocument();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(
      <Sources defaultOpen>
        <SourcesTrigger count={2} />
        <SourcesContent>
          <Source index={1} title="Paris — overview" origin="example.org" href="#1" />
          <Source index={2} title="France factbook" href="#2" />
        </SourcesContent>
      </Sources>,
    );
    await expectNoA11yViolations(container);
  });
});
