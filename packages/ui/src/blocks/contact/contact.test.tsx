import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { ContactBlock } from "./contact";

function fill(fields: Partial<Record<"Name" | "Email" | "Message", string>>) {
  for (const [label, value] of Object.entries(fields)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
}

describe("ContactBlock", () => {
  it("lists real contact links and an address beside a labelled form", async () => {
    const { container } = render(<ContactBlock />);
    expect(screen.getByRole("region", { name: "Get in touch" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "hello@example.com" })).toHaveAttribute(
      "href",
      "mailto:hello@example.com",
    );
    expect(container.querySelector("address")).toHaveTextContent("London");
    expect(screen.getByRole("form", { name: "Contact form" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "What is it about?" })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });

  it("checks on submit, says what is wrong beside each field, and focuses the first problem", async () => {
    const onSubmit = vi.fn();
    render(<ContactBlock onSubmit={onSubmit} />);
    fill({ Email: "nope" });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(
      screen.getByText("Enter an email address like name@example.com."),
    ).toBeInTheDocument();
    expect(screen.getByText("Choose what this is about.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(/name@example.com/);
    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveFocus();
    });
    // Editing a field clears its message.
    fill({ Name: "Ada" });
    expect(screen.queryByText("Enter your name.")).not.toBeInTheDocument();
  });

  it("sends, says so while sending, then confirms and takes focus", async () => {
    let resolve: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((done) => (resolve = done)));
    render(<ContactBlock onSubmit={onSubmit} />);
    fill({ Name: "Ada", Email: "ada@example.com", Message: "Tell me about the Pro plan." });
    fireEvent.click(screen.getByRole("radio", { name: "Sales" }));
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Ada",
      email: "ada@example.com",
      company: "",
      topic: "Sales",
      message: "Tell me about the Pro plan.",
    });
    expect(screen.getByRole("button", { name: /Sending/ })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Message sent");
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveFocus();
    });
  });

  it("shows a failure and keeps what was typed", async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error("The server is busy.")));
    render(<ContactBlock onSubmit={onSubmit} topics={[]} />);
    fill({ Name: "Ada", Email: "ada@example.com", Message: "Something long enough." });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }));
      await Promise.resolve();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("The server is busy.");
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
  });
});
