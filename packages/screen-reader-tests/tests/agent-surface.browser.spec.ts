import { expect, test } from "@playwright/test";

/**
 * What `agent-surface` does with a real click.
 *
 * While the agent holds the page, operating a control takes it back. That is
 * detected in the event's capture phase, and React renders between the
 * capture and bubble phases of a real event. If control changed there, a
 * controlled checkbox or field was rendered back to its old value before its
 * own `onChange` was worked out: the person took the page and lost the click
 * that took it.
 *
 * jsdom cannot show this. A scripted event never yields between its
 * listeners, so React never gets to render mid-event, and the component's
 * unit tests passed with the bug in place. So it is checked here, in a
 * browser, against a story where the agent holds the page from the start.
 */
const STORY = "/iframe.html?id=ai-agent-surface--held-by-the-agent&viewMode=story";

test.describe("taking over with a real event", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(STORY, { waitUntil: "load" });
    await expect(page.locator("[data-slot='agent-surface']")).toHaveAttribute(
      "data-holder",
      "agent",
    );
  });

  test("the tick that takes control still ticks the box", async ({ page }) => {
    const box = page.getByRole("checkbox", { name: "Select Bolt renewal" });
    await box.click();

    await expect(page.locator("[data-slot='agent-surface']")).toHaveAttribute(
      "data-holder",
      "person",
    );
    await expect(box).toBeChecked();
  });

  test("the keystroke that takes control stays in the field", async ({ page }) => {
    const filter = page.getByLabel("Filter deals");
    await filter.pressSequentially("ren");

    await expect(page.locator("[data-slot='agent-surface']")).toHaveAttribute(
      "data-holder",
      "person",
    );
    await expect(filter).toHaveValue("ren");
    // And it filtered: the person's handler ran, not only the field's value.
    await expect(page.getByRole("checkbox", { name: /^Select / })).toHaveCount(2);
  });
});
