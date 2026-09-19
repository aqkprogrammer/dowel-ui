"use client";

// Ported from SmoothUI Tweet Card (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import { cva, type VariantProps } from "class-variance-authority";
import { useId, type ComponentPropsWithRef, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Skeleton } from "@/components/skeleton";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A post, drawn from props. The source fetched it with react-tweet; this
 * never touches the network, so it renders on the server, in a static
 * export and in a test, and the data can come from any API — or be written
 * by hand for a testimonial wall.
 *
 * The source's "open" control was a button calling window.open that only
 * appeared on hover. Here it is a real link, revealed on hover *and* on
 * keyboard focus, and always visible on devices that cannot hover.
 */

const tweetCardVariants = cva(
  cn(
    "group/tweet relative flex flex-col gap-6 overflow-hidden rounded-xl border border-border bg-card p-6 text-card-foreground",
    "transition-[border-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)] hover:shadow-md",
  ),
);

/** The avatar's corner shape — the source's `avatarRounded`. */
const tweetCardAvatarVariants = cva("size-10", {
  variants: {
    avatarShape: {
      circle: "rounded-full",
      rounded: "rounded",
      "rounded-md": "rounded-md",
      "rounded-lg": "rounded-lg",
    },
  },
  defaultVariants: {
    avatarShape: "rounded",
  },
});

export interface TweetCardAuthor {
  name: string;
  /** Without the leading "@". */
  handle: string;
  /** Image URL. Initials are shown while it loads and if it fails. */
  avatar?: string;
  verified?: boolean;
  /** Profile URL. Defaults to the handle on x.com. */
  href?: string;
}

export interface TweetCardMedia {
  src: string;
  /** Describe the image; an empty string marks it decorative. */
  alt: string;
  width?: number;
  height?: number;
}

export interface TweetCardMetrics {
  replies?: number;
  reposts?: number;
  likes?: number;
  views?: number;
}

export interface TweetCardProps
  extends
    Omit<ComponentPropsWithRef<"article">, "children">,
    VariantProps<typeof tweetCardAvatarVariants> {
  author: TweetCardAuthor;
  /** A string is linked: URLs, @mentions and #hashtags. Pass nodes to control it. */
  text: ReactNode;
  /** Up to four photos, laid out as the source did. */
  media?: TweetCardMedia[];
  timestamp?: Date | string;
  metrics?: TweetCardMetrics;
  /** The post's URL. Adds the "view post" link. */
  href?: string;
  /** Where the author sits. */
  userInfoPosition?: "top" | "bottom";
  /** BCP 47 locale for the date and counts. */
  locale?: string;
  /** Name of the link to the post. */
  linkLabel?: string;
}

const ENTITY = /(https?:\/\/[^\s]+|@\w{1,15}|#[\p{L}\p{N}_]+)/gu;

const linkStyles = cn(
  "rounded-sm font-medium text-primary underline-offset-4 hover:underline",
  focusRing,
);

/** Splits plain text into text and links, as react-tweet's entities did. */
function linkify(text: string): ReactNode[] {
  return text.split(ENTITY).map((part, index) => {
    if (index % 2 === 0) return part;
    const href = part.startsWith("@")
      ? `https://x.com/${part.slice(1)}`
      : part.startsWith("#")
        ? `https://x.com/hashtag/${encodeURIComponent(part.slice(1))}`
        : part;
    return (
      <a
        key={index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkStyles}
      >
        {part}
      </a>
    );
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

/** Truncates a long handle, as the source did at 16 characters. */
export function truncate(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, length - 1)}…`;
}

function VerifiedBadge() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-slot="tweet-card-verified"
      className="size-4 shrink-0 text-primary"
    >
      <path
        fill="currentColor"
        d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.65.16-.44.25-.92.25-1.43 0-2.21-1.71-4-3.83-4-.47 0-.93.09-1.35.25C14.8 2.37 13.5 1.5 12 1.5s-2.8.87-3.39 2.17a3.7 3.7 0 0 0-1.35-.25c-2.12 0-3.83 1.79-3.83 4 0 .51.09.99.25 1.43A4.1 4.1 0 0 0 1.5 12.5c0 1.5.8 2.8 1.98 3.52-.02.15-.03.3-.03.46 0 2.21 1.71 4 3.83 4 .47 0 .93-.09 1.35-.25.59 1.3 1.88 2.17 3.37 2.17s2.78-.87 3.37-2.17c.42.16.88.25 1.35.25 2.12 0 3.83-1.79 3.83-4 0-.16-.01-.31-.03-.46a4.1 4.1 0 0 0 1.98-3.52Z"
      />
      <path
        d="m8.5 12.5 2.5 2.5 4.5-5"
        fill="none"
        stroke="var(--color-primary-foreground)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MediaGrid({ media }: { media: TweetCardMedia[] }) {
  const photos = media.slice(0, 4);
  const image = (photo: TweetCardMedia, className?: string) => (
    <img
      key={photo.src}
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      loading="lazy"
      draggable={false}
      className={cn("size-full rounded-xl border border-border object-cover", className)}
    />
  );
  return (
    <div
      data-slot="tweet-card-media"
      className={cn("grid w-full gap-2", photos.length > 1 && "grid-cols-2")}
    >
      {photos.map((photo, index) =>
        image(photo, index === 0 && photos.length === 3 ? "row-span-2" : undefined),
      )}
    </div>
  );
}

const METRICS: { key: keyof TweetCardMetrics; label: string; path: string }[] = [
  {
    key: "replies",
    label: "replies",
    path: "M21 11.5a8.4 8.4 0 0 1-9 8.5 9 9 0 0 1-3.8-.8L3 21l1.8-4.7A8.4 8.4 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z",
  },
  {
    key: "reposts",
    label: "reposts",
    path: "m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3",
  },
  {
    key: "likes",
    label: "likes",
    path: "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z",
  },
  { key: "views", label: "views", path: "M3 3v18h18M7 16V9m5 7V5m5 11v-4" },
];

/** A social post rendered from props — no network, no embed script. */
export function TweetCard({
  className,
  author,
  text,
  media,
  timestamp,
  metrics,
  href,
  userInfoPosition = "bottom",
  avatarShape,
  locale,
  linkLabel = "View post on X",
  id,
  ...props
}: TweetCardProps) {
  const uid = useId();
  const nameId = `${id ?? uid}-author`;
  const date = timestamp === undefined ? undefined : new Date(timestamp);
  const validDate = date && !Number.isNaN(date.getTime()) ? date : undefined;
  const count = new Intl.NumberFormat(locale, { notation: "compact" });
  const shown = METRICS.filter(({ key }) => metrics?.[key] !== undefined);

  const userInfo = (
    <div data-slot="tweet-card-author" className="flex items-center gap-2">
      <a
        href={author.href ?? `https://x.com/${author.handle}`}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
        className="shrink-0"
      >
        <Avatar className={tweetCardAvatarVariants({ avatarShape })}>
          {author.avatar ? <AvatarImage src={author.avatar} alt="" /> : null}
          <AvatarFallback className="rounded-[inherit]">{initials(author.name)}</AvatarFallback>
        </Avatar>
      </a>
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-sm font-semibold tracking-tight">
          <a
            id={nameId}
            href={author.href ?? `https://x.com/${author.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("truncate rounded-sm hover:underline", focusRing)}
          >
            {author.name}
          </a>
          {author.verified ? (
            <>
              <VerifiedBadge />
              <span className="sr-only">Verified account</span>
            </>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">@{truncate(author.handle, 16)}</p>
      </div>
    </div>
  );

  return (
    <article
      id={id}
      data-slot="tweet-card"
      aria-labelledby={nameId}
      className={cn(tweetCardVariants(), className)}
      {...props}
    >
      {userInfoPosition === "top" ? userInfo : null}
      <blockquote
        data-slot="tweet-card-text"
        cite={href}
        className="text-sm tracking-tight text-balance whitespace-pre-line"
      >
        {typeof text === "string" ? linkify(text) : text}
      </blockquote>
      {media && media.length > 0 ? <MediaGrid media={media} /> : null}
      {validDate || shown.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {validDate ? (
            <time dateTime={validDate.toISOString()}>
              {validDate.toLocaleDateString(locale, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          ) : null}
          {shown.length > 0 ? (
            <ul data-slot="tweet-card-metrics" className="flex items-center gap-4">
              {shown.map(({ key, label, path }) => (
                <li key={key} className="flex items-center gap-1">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="size-3.5"
                  >
                    <path d={path} />
                  </svg>
                  <span aria-hidden="true">{count.format(metrics?.[key] ?? 0)}</span>
                  <span className="sr-only">{`${String(metrics?.[key] ?? 0)} ${label}`}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {userInfoPosition === "bottom" ? userInfo : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={linkLabel}
          data-slot="tweet-card-link"
          className={cn(
            "absolute end-6 bottom-6 z-10 grid size-8 place-items-center rounded-full border border-border bg-primary text-primary-foreground",
            "opacity-0 transition-[opacity,scale] duration-[var(--duration-normal)] ease-[var(--ease-out-quint)]",
            "group-hover/tweet:opacity-100 hover:scale-110 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
            focusRing,
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-4"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
        </a>
      ) : null}
    </article>
  );
}

/** Placeholder while a post loads — the source's TweetSkeleton. */
export function TweetCardSkeleton({ className, ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      data-slot="tweet-card-skeleton"
      aria-hidden="true"
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl border border-border p-4",
        className,
      )}
      {...props}
    >
      <div className="flex gap-2">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

export { tweetCardAvatarVariants, tweetCardVariants };
