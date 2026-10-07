import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
  alertDialogVariants,
} from "./alert-dialog";

function Warning() {
  return (
    <svg data-testid="warning" viewBox="0 0 24 24">
      <path d="M12 3 2 21h20L12 3Z" />
    </svg>
  );
}

function Example({
  tone,
  onAction,
  icon,
}: {
  tone?: "default" | "destructive";
  onAction?: () => void;
  icon?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete project</AlertDialogTrigger>
      <AlertDialogContent tone={tone}>
        <AlertDialogHeader icon={icon ? <Warning /> : undefined}>
          <AlertDialogTitle>Delete acme-inc?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onAction}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

async function open() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Delete project" }));
  const dialog = await screen.findByRole("alertdialog");
  return { user, dialog };
}

describe("AlertDialog", () => {
  it("opens an alertdialog named and described by its title and description", async () => {
    render(<Example />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    const { dialog } = await open();
    expect(dialog).toHaveAccessibleName("Delete acme-inc?");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
    expect(dialog).toHaveAttribute("data-slot", "alert-dialog-content");
    expect(document.querySelector("[data-slot=alert-dialog-overlay]")).toHaveAttribute(
      "data-state",
      "open",
    );
  });

  it("opens from the keyboard and focuses Cancel, the safe choice", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    await user.keyboard("{Enter}");
    await screen.findByRole("alertdialog");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    });
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    render(<Example />);
    const { user } = await open();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete project" })).toHaveFocus();
    });
  });

  it("confirms with the action and closes", async () => {
    const onAction = vi.fn();
    render(<Example onAction={onAction} />);
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("closes with Cancel", async () => {
    render(<Example />);
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("uses the primary action and a neutral tile in the default tone", async () => {
    render(<Example icon />);
    const { dialog } = await open();
    expect(dialog).toHaveAttribute("data-tone", "default");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-primary");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("border-input");
    const media = dialog.querySelector("[data-slot=alert-dialog-media]");
    expect(media).toHaveClass("bg-muted");
    expect(media).toHaveAttribute("aria-hidden", "true");
  });

  it("tints the tile and defaults the action to destructive in the destructive tone", async () => {
    render(<Example tone="destructive" icon />);
    const { dialog } = await open();
    expect(dialog).toHaveAttribute("data-tone", "destructive");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-destructive");
    expect(dialog.querySelector("[data-slot=alert-dialog-media]")).toHaveClass(
      "text-destructive",
    );
    expect(screen.getByTestId("warning")).toBeInTheDocument();
    expect(alertDialogVariants({ tone: "destructive" })).toContain("var(--color-destructive)");
  });

  it("renders no tile without an icon, and takes AlertDialogMedia directly", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent tone="destructive">
          <AlertDialogHeader>
            <AlertDialogMedia className="rounded-md" data-testid="media">
              <Warning />
            </AlertDialogMedia>
            <AlertDialogTitle>Revoke key</AlertDialogTitle>
            <AlertDialogDescription>Apps using it stop working.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost">Keep</AlertDialogCancel>
            <AlertDialogAction variant="secondary" size="sm">
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("alertdialog");
    const media = screen.getByTestId("media");
    expect(media).toHaveClass("rounded-md");
    expect(media).not.toHaveClass("rounded-full");
    expect(screen.getByRole("button", { name: "Revoke" })).toHaveClass("bg-secondary", "h-8");
    expect(screen.getByRole("button", { name: "Keep" })).not.toHaveClass("border-input");
  });

  it("omits the tile when the header has no icon", async () => {
    render(<Example tone="destructive" />);
    const { dialog } = await open();
    expect(dialog.querySelector("[data-slot=alert-dialog-media]")).toBeNull();
  });

  it("works as a controlled component", async () => {
    const onOpenChange = vi.fn();
    function Controlled() {
      const [isOpen, setOpen] = useState(false);
      return (
        <AlertDialog
          open={isOpen}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
        >
          <AlertDialogTrigger>Delete project</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Controlled</AlertDialogTitle>
            <AlertDialogDescription>Body</AlertDialogDescription>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    render(<Controlled />);
    const { user } = await open();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("lets consumer classNames win and forwards refs and props", async () => {
    const ref = createRef<HTMLDivElement>();
    const user = userEvent.setup();
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent ref={ref} className="max-w-sm p-8" data-testid="content">
          <AlertDialogHeader className="gap-3" data-testid="header">
            <AlertDialogTitle className="text-xl">Title</AlertDialogTitle>
            <AlertDialogDescription className="text-base">Description</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-start" data-testid="footer">
            <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const content = await screen.findByTestId("content");
    expect(ref.current).toBe(content);
    expect(content).toHaveClass("max-w-sm", "p-8");
    expect(content).not.toHaveClass("max-w-lg", "p-6");
    expect(screen.getByTestId("header")).toHaveClass("gap-3");
    expect(screen.getByTestId("header")).not.toHaveClass("gap-1.5");
    expect(screen.getByText("Title")).toHaveClass("text-xl");
    expect(screen.getByText("Description")).toHaveClass("text-base");
    expect(screen.getByTestId("footer")).toHaveClass("justify-start");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("h-12");
  });

  it("has no accessibility violations while open, in either tone", async () => {
    const { baseElement, unmount } = render(<Example tone="destructive" icon />);
    await open();
    await expectNoA11yViolations(baseElement);
    unmount();
    const second = render(<Example icon />);
    await open();
    await expectNoA11yViolations(second.baseElement);
  });
});
