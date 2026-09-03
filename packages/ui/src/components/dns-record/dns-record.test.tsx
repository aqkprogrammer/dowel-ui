import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { DnsRecord, dnsHostForms, type DnsRecordProps } from "./dns-record";

function Example(props: Partial<DnsRecordProps> = {}) {
  return (
    <DnsRecord
      type="TXT"
      name="_acme-challenge"
      zone="acme.com"
      value="v=verify 7f3a9c"
      purpose="Proves you own acme.com"
      onCheck={vi.fn()}
      {...props}
    />
  );
}

const part = (key: string) => document.querySelector(`[data-part='${key}']`);
const status = () => document.querySelector("[data-slot='dns-record-status']");
const copyStatus = () => document.querySelector("span[role='status']");

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

describe("dnsHostForms", () => {
  it("shows a relative host both ways", () => {
    expect(dnsHostForms("_dmarc", "acme.com")).toEqual({
      relative: "_dmarc",
      full: "_dmarc.acme.com",
    });
  });

  it("accepts a fully qualified host and gives the relative form back", () => {
    expect(dnsHostForms("_dmarc.acme.com", "acme.com")).toEqual({
      relative: "_dmarc",
      full: "_dmarc.acme.com",
    });
  });

  it("treats the zone itself, @ and an empty name as the apex", () => {
    for (const name of ["@", "", "acme.com", "acme.com."]) {
      expect(dnsHostForms(name, "acme.com")).toEqual({ relative: "@", full: "acme.com" });
    }
  });

  it("ignores a trailing dot on either side", () => {
    expect(dnsHostForms("mail.", "acme.com.")).toEqual({
      relative: "mail",
      full: "mail.acme.com",
    });
  });
});

describe("DnsRecord", () => {
  it("names the record by its type and purpose", () => {
    render(<Example />);
    expect(
      screen.getByRole("region", { name: /TXT record.*Proves you own acme\.com/ }),
    ).toBeInTheDocument();
  });

  it("shows each part on its own, with its own copy button", () => {
    render(<Example ttl={3600} />);

    expect(part("type")).toHaveTextContent("TXT");
    expect(part("name")).toHaveTextContent("_acme-challenge");
    expect(part("value")).toHaveTextContent("v=verify 7f3a9c");
    expect(part("ttl")).toHaveTextContent("3600");
    expect(screen.getByRole("button", { name: "Copy name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy value" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy ttl" })).toBeInTheDocument();
  });

  it("shows priority for a record that has one", () => {
    render(<Example type="MX" name="@" value="mx1.acme-mail.test" priority={10} />);
    expect(part("priority")).toHaveTextContent("10");
    expect(screen.getByRole("button", { name: "Copy priority" })).toBeInTheDocument();
  });

  describe("the name trap", () => {
    it("shows the relative host and says when the full one is wanted", () => {
      render(<Example />);

      expect(part("name")).toHaveTextContent("_acme-challenge");
      expect(screen.getByText(/Some providers want the full name/)).toHaveTextContent(
        "_acme-challenge.acme.com",
      );
      expect(screen.getByText(/If the field already ends in/)).toBeInTheDocument();
    });

    it("gives the relative host even when the record was declared fully qualified", () => {
      render(<Example name="_acme-challenge.acme.com" />);
      expect(part("name")).toHaveTextContent(/^_acme-challenge$/);
    });

    it("explains @ for the apex", () => {
      render(<Example name="@" />);

      expect(part("name")).toHaveTextContent("@");
      expect(screen.getByText(/or leave it blank/)).toHaveTextContent("acme.com");
    });

    it("says nothing about forms without a zone to relate to", () => {
      render(<Example zone={undefined} name="_acme-challenge.acme.com" />);

      expect(part("name")).toHaveTextContent("_acme-challenge.acme.com");
      expect(screen.queryByText(/Some providers/)).not.toBeInTheDocument();
    });
  });

  it("tells TXT records to leave the quotes out", () => {
    const { rerender } = render(<Example />);
    expect(screen.getByText(/Enter without quotes/)).toBeInTheDocument();

    rerender(<Example type="CNAME" value="cname.vercel-dns.test" />);
    expect(screen.queryByText(/Enter without quotes/)).not.toBeInTheDocument();
  });

  describe("status", () => {
    it("starts unchecked, in words", () => {
      render(<Example />);
      expect(status()).toHaveTextContent("Not checked yet");
      expect(status()).toHaveAttribute("aria-live", "polite");
    });

    it("says it is checking, and marks the card busy", () => {
      const { container } = render(<Example status="checking" />);

      expect(status()).toHaveTextContent("Checking…");
      expect(container.querySelector("[data-slot='dns-record']")).toHaveAttribute(
        "aria-busy",
        "true",
      );
      expect(screen.getByRole("button", { name: /Check now/ })).toHaveAttribute(
        "aria-busy",
        "true",
      );
    });

    it("says verified, with when", () => {
      render(
        <Example
          status="verified"
          checkedAt={new Date("2026-09-04T10:30:00Z")}
          locale="en-GB"
        />,
      );

      expect(status()).toHaveTextContent(/Verified · checked 4 Sept 2026/);
      expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
    });

    it("distinguishes nothing found from something else found", () => {
      const { rerender } = render(<Example status="failed" />);
      expect(status()).toHaveTextContent(
        /Nothing found yet — DNS changes can take up to 48 hours/,
      );
      expect(document.querySelector("[data-slot='dns-record-found']")).not.toBeInTheDocument();

      rerender(<Example status="failed" found={["v=verify 7f3a9d"]} />);
      expect(status()).toHaveTextContent("Not verified. Something else was found.");
      const found = document.querySelector("[data-slot='dns-record-found']") as HTMLElement;
      expect(within(found).getByText("v=verify 7f3a9d")).toBeInTheDocument();
    });

    it("lists everything that was found", () => {
      render(
        <Example status="failed" found={["v=spf1 -all", "google-site-verification=abc"]} />,
      );

      const found = document.querySelector("[data-slot='dns-record-found']") as HTMLElement;
      expect(within(found).getAllByRole("listitem")).toHaveLength(2);
    });
  });

  it("asks for a check", async () => {
    const onCheck = vi.fn();
    const user = userEvent.setup();
    render(<Example onCheck={onCheck} />);

    await user.click(screen.getByRole("button", { name: "Check now" }));
    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it("offers no check without a handler", () => {
    render(<Example onCheck={undefined} />);
    expect(screen.queryByRole("button", { name: /Check/ })).not.toBeInTheDocument();
  });

  describe("copying", () => {
    it("copies one part, and says which", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubClipboard(writeText);
      render(<Example />);

      await user.click(screen.getByRole("button", { name: "Copy value" }));

      expect(writeText).toHaveBeenCalledWith("v=verify 7f3a9c");
      await waitFor(() => {
        expect(copyStatus()).toHaveTextContent("Copied value");
      });
      expect(screen.getByRole("button", { name: "Copy value" })).toHaveTextContent("Copied");
      expect(screen.getByRole("button", { name: "Copy name" })).toHaveTextContent("Copy");
    });

    it("copies the relative host, which is what the field wants", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      stubClipboard(writeText);
      render(<Example name="_acme-challenge.acme.com" />);

      await user.click(screen.getByRole("button", { name: "Copy name" }));
      expect(writeText).toHaveBeenCalledWith("_acme-challenge");
    });

    it("announces failure with what to do instead", async () => {
      const user = userEvent.setup();
      stubClipboard(vi.fn().mockRejectedValue(new Error("refused")));
      render(<Example />);

      await user.click(screen.getByRole("button", { name: "Copy name" }));

      await waitFor(() => {
        expect(copyStatus()).toHaveTextContent(
          "Could not copy name. Select it and copy by hand.",
        );
        // Said on screen too, beside the part that failed, not only announced.
        const error = document.querySelector("[data-slot='dns-record-copy-error']");
        expect(error).toBeVisible();
        expect(error?.closest("dd")).toContainElement(part("name") as HTMLElement);
      });
    });

    it("has its announcement region in place from the start", () => {
      render(<Example />);
      expect(copyStatus()).toBeEmptyDOMElement();
    });
  });

  it("renders children between the heading and the parts", () => {
    render(
      <Example>
        <p>Sign in to your registrar and open DNS settings.</p>
      </Example>,
    );
    expect(screen.getByText(/open DNS settings/)).toBeInTheDocument();
  });

  it("lets a className override win a conflict", () => {
    const { container } = render(<Example className="p-8" />);
    const root = container.querySelector("[data-slot='dns-record']");
    expect(root).toHaveClass("p-8");
    expect(root).not.toHaveClass("p-4");
  });

  it("forwards a ref and native attributes", () => {
    const ref = createRef<HTMLElement>();
    render(<Example ref={ref} data-testid="record" />);
    expect(ref.current).toBe(screen.getByTestId("record"));
  });

  it("has no accessibility violations pending, checking and failed", async () => {
    const { container, rerender } = render(<Example />);
    await expectNoA11yViolations(container);

    rerender(<Example status="checking" />);
    await expectNoA11yViolations(container);

    rerender(<Example status="failed" found={["v=verify 7f3a9d"]} />);
    await expectNoA11yViolations(container);
  });
});
