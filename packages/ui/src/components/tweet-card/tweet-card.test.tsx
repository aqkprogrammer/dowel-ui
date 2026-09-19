import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import { TweetCard, TweetCardSkeleton, truncate, type TweetCardProps } from "./tweet-card";

const BASE: TweetCardProps = {
  author: { name: "Ada Lovelace", handle: "adalovelace", verified: true },
  text: "Hello world! See https://example.com with @charles about #engines",
  href: "https://x.com/adalovelace/status/1",
  timestamp: "2024-01-01T12:00:00Z",
  metrics: { replies: 3, reposts: 12, likes: 1200 },
  locale: "en-US",
};

describe("truncate", () => {
  it("keeps short strings and shortens long ones", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("a very long screen name", 10)).toBe("a very lo…");
  });
});

describe("TweetCard", () => {
  it("renders an article named by its author", () => {
    render(<TweetCard {...BASE} />);
    const article = screen.getByRole("article", { name: "Ada Lovelace" });
    expect(within(article).getByText("@adalovelace")).toBeInTheDocument();
    expect(within(article).getByText("Verified account")).toHaveClass("sr-only");
  });

  it("links URLs, mentions and hashtags in string text", () => {
    render(<TweetCard {...BASE} />);
    expect(screen.getByRole("link", { name: "https://example.com" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getByRole("link", { name: "@charles" })).toHaveAttribute(
      "href",
      "https://x.com/charles",
    );
    expect(screen.getByRole("link", { name: "#engines" })).toHaveAttribute(
      "href",
      "https://x.com/hashtag/engines",
    );
  });

  it("renders node text as given", () => {
    render(<TweetCard {...BASE} text={<strong>Bold claim</strong>} />);
    expect(screen.getByText("Bold claim").tagName).toBe("STRONG");
  });

  it("links out to the post in a new tab", () => {
    render(<TweetCard {...BASE} />);
    const link = screen.getByRole("link", { name: "View post on X" });
    expect(link).toHaveAttribute("href", BASE.href);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("focus-visible:opacity-100");
  });

  it("omits the post link without an href and takes a custom link label", () => {
    const { rerender } = render(<TweetCard {...BASE} href={undefined} />);
    expect(screen.queryByRole("link", { name: "View post on X" })).not.toBeInTheDocument();
    rerender(<TweetCard {...BASE} linkLabel="Open post" />);
    expect(screen.getByRole("link", { name: "Open post" })).toBeInTheDocument();
  });

  it("links the author name to the profile", () => {
    const { rerender } = render(<TweetCard {...BASE} />);
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute(
      "href",
      "https://x.com/adalovelace",
    );
    rerender(<TweetCard {...BASE} author={{ ...BASE.author, href: "https://ada.dev" }} />);
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute(
      "href",
      "https://ada.dev",
    );
  });

  it("shows the date in a time element and reads counts in full", () => {
    const { container } = render(<TweetCard {...BASE} />);
    expect(container.querySelector("time")).toHaveAttribute(
      "datetime",
      "2024-01-01T12:00:00.000Z",
    );
    expect(screen.getByText("1.2K")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("1200 likes")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("omits the footer when there is no date or metric, and ignores an invalid date", () => {
    const { container } = render(
      <TweetCard {...BASE} timestamp="not a date" metrics={undefined} />,
    );
    expect(container.querySelector("time")).toBeNull();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("places the author at the bottom by default, or at the top", () => {
    const { rerender } = render(<TweetCard {...BASE} />);
    const article = screen.getByRole("article");
    expect(article.firstElementChild).toHaveAttribute("data-slot", "tweet-card-text");
    rerender(<TweetCard {...BASE} userInfoPosition="top" />);
    expect(article.firstElementChild).toHaveAttribute("data-slot", "tweet-card-author");
  });

  it("shapes the avatar and shows initials without an image", () => {
    const { container } = render(<TweetCard {...BASE} avatarShape="circle" />);
    const avatar = container.querySelector('[data-slot="tweet-card-author"] span');
    expect(avatar).toHaveClass("rounded-full");
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("lays out one to four photos", () => {
    const photo = (n: number) => ({
      src: `https://img.test/${String(n)}.jpg`,
      alt: `Photo ${String(n)}`,
    });
    const { rerender } = render(<TweetCard {...BASE} media={[photo(1)]} />);
    expect(screen.getAllByRole("img", { name: /Photo/ })).toHaveLength(1);
    rerender(<TweetCard {...BASE} media={[photo(1), photo(2), photo(3)]} />);
    expect(screen.getByRole("img", { name: "Photo 1" })).toHaveClass("row-span-2");
    rerender(
      <TweetCard {...BASE} media={[photo(1), photo(2), photo(3), photo(4), photo(5)]} />,
    );
    expect(screen.getAllByRole("img", { name: /Photo/ })).toHaveLength(4);
  });

  it("lets the consumer className win, forwards a ref and props", () => {
    const ref = createRef<HTMLElement>();
    render(<TweetCard {...BASE} ref={ref} id="post" className="p-2" data-testid="card" />);
    const article = screen.getByTestId("card");
    expect(ref.current).toBe(article);
    expect(article).toHaveClass("p-2");
    expect(article).not.toHaveClass("p-6");
    expect(article).toHaveAttribute("aria-labelledby", "post-author");
  });

  it("renders a decorative skeleton", () => {
    const { container } = render(<TweetCardSkeleton className="w-80" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.firstElementChild).toHaveClass("w-80");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <TweetCard {...BASE} media={[{ src: "https://img.test/1.jpg", alt: "A loom" }]} />,
    );
    await expectNoA11yViolations(container);
  });
});
