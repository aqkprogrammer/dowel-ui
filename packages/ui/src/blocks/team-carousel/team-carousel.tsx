"use client";

// Ported from SmoothUI Team 2 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { Button } from "@/components/button";
import { Separator } from "@/components/separator";
import { focusRing, mirrorForDirection } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * A large two-tone heading over a horizontal carousel of member cards, with
 * previous and next buttons.
 *
 * The source moves a track by a fixed pixel width, cannot be swiped, hides its
 * buttons below the md breakpoint — leaving phones with no way through — and
 * advances by itself every five seconds with no way to stop it. Here the
 * track is a native scroll-snap scroller: it swipes on touch, scrolls with the
 * keyboard once focused, mirrors for right-to-left pages, and the buttons
 * scroll the next card into view (smoothly, unless reduced motion is on).
 * There is no autoplay (WCAG 2.2.2); the position is announced politely when
 * a button moves it.
 *
 * Structure follows the APG carousel pattern: the section is a carousel, each
 * card a named "slide" group.
 */

const PREFIX = "dowel-team-carousel";

/* Cards rise in as they first render: an entrance, not a loop, and instant
 * under reduced motion. */
const STYLES = `
[data-slot=team-carousel-slide]{transition:opacity var(--duration-slower) var(--ease-out-quint),translate var(--duration-slower) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1))}
@starting-style{[data-slot=team-carousel-slide]{opacity:0;translate:0 20px}}
`;

export interface TeamCarouselMember {
  name: string;
  role: string;
  /** Portrait URL. Without one, or if it fails, the member's initials are shown. */
  avatar?: string;
  /** A line under the divider — experience, a quote, a fun fact. */
  experience?: ReactNode;
}

export const DEFAULT_TEAM_CAROUSEL: TeamCarouselMember[] = [
  {
    name: "Ada Park",
    role: "Founder and CEO",
    experience: "12 years building developer tools",
  },
  {
    name: "Tomás Reyes",
    role: "Head of Design",
    experience: "Previously led a design system team",
  },
  {
    name: "Noor Haddad",
    role: "Staff Engineer",
    experience: "Compilers, then browsers, now us",
  },
  { name: "Mika Lehtonen", role: "Product Manager", experience: "Ships small, ships often" },
  {
    name: "Sade Okafor",
    role: "Developer Advocate",
    experience: "Has answered every question twice",
  },
  { name: "Lin Wei", role: "Infrastructure Lead", experience: "Keeps the pager quiet" },
];

export interface TeamCarouselLabels {
  previous: string;
  next: string;
  /** Names each slide, and announces the position after a button moves it. */
  position: (index: number, count: number) => string;
  /** Names the scrollable track. */
  track: string;
}

const DEFAULT_LABELS: TeamCarouselLabels = {
  previous: "Previous team member",
  next: "Next team member",
  position: (index, count) => `${String(index + 1)} of ${String(count)}`,
  track: "Team members",
};

export interface TeamCarouselBlockProps extends Omit<
  ComponentPropsWithRef<"section">,
  "title"
> {
  heading?: ReactNode;
  /** A muted second line of the heading. */
  subheading?: ReactNode;
  description?: ReactNode;
  members?: TeamCarouselMember[];
  /** Level of the section heading; each member's name is one level below. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  labels?: Partial<TeamCarouselLabels>;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function Arrow({ back }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={mirrorForDirection}
    >
      <path d={back ? "m12 19-7-7 7-7M19 12H5" : "M5 12h14m-7-7 7 7-7 7"} />
    </svg>
  );
}

/** A two-tone heading over a swipeable carousel of team member cards. */
export function TeamCarouselBlock({
  heading = "Tech pioneers",
  subheading = "building the future",
  description = "Developers, engineers and designers working together on tools people enjoy using.",
  members = DEFAULT_TEAM_CAROUSEL,
  headingLevel = 2,
  labels,
  className,
  ...props
}: TeamCarouselBlockProps) {
  const headingId = useId();
  const text = { ...DEFAULT_LABELS, ...labels };
  const Heading = `h${String(headingLevel)}` as "h2";
  const Name = `h${String(Math.min(headingLevel + 1, 6))}` as "h3";
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    index: 0,
    atEnd: members.length <= 1,
    scrollable: false,
  });
  const [announcement, setAnnouncement] = useState("");
  const count = members.length;

  /** Which card is at the start edge, and whether the track can scroll further. */
  const measure = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const slides = [...element.children] as HTMLElement[];
    const rtl = getComputedStyle(element).direction === "rtl";
    const box = element.getBoundingClientRect();
    let index = 0;
    let nearest = Number.POSITIVE_INFINITY;
    slides.forEach((slide, slideIndex) => {
      const rect = slide.getBoundingClientRect();
      const distance = Math.abs(rtl ? box.right - rect.right : rect.left - box.left);
      if (distance < nearest) {
        nearest = distance;
        index = slideIndex;
      }
    });
    const scrollable = element.scrollWidth > element.clientWidth;
    const atEnd =
      index >= slides.length - 1 ||
      (scrollable &&
        Math.abs(element.scrollLeft) + element.clientWidth >= element.scrollWidth - 1);
    setPosition({ index, atEnd, scrollable });
  }, []);

  useEffect(() => {
    measure();
  }, [measure, count]);

  function go(step: -1 | 1) {
    const target = Math.min(Math.max(position.index + step, 0), count - 1);
    const slide = track.current?.children[target];
    if (slide instanceof HTMLElement && typeof slide.scrollIntoView === "function") {
      slide.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest",
        inline: "start",
      });
    }
    setPosition({ ...position, index: target, atEnd: target >= count - 1 });
    setAnnouncement(text.position(target, count));
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-roledescription="carousel"
      data-slot="team-carousel"
      className={cn(
        "mx-auto w-full max-w-5xl overflow-hidden px-4 py-16 sm:px-8 md:py-32",
        className,
      )}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <Heading id={headingId} className="text-4xl font-medium tracking-tight md:text-6xl">
        {heading}
        {subheading ? (
          <>
            {" "}
            <br />
            <span className="text-muted-foreground">{subheading}</span>
          </>
        ) : null}
      </Heading>
      {description ? (
        <p className="mt-6 max-w-md text-pretty text-muted-foreground">{description}</p>
      ) : null}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          shape="pill"
          aria-label={text.previous}
          disabled={position.index <= 0}
          onClick={() => {
            go(-1);
          }}
        >
          <Arrow back />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          shape="pill"
          aria-label={text.next}
          disabled={position.atEnd}
          onClick={() => {
            go(1);
          }}
        >
          <Arrow />
        </Button>
      </div>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>

      {/* Once it overflows, a focusable, named scroller: keyboard users can
          scroll it with the arrow keys, and axe's scrollable-region rule holds. */}
      <div
        ref={track}
        role="region"
        aria-label={text.track}
        tabIndex={position.scrollable ? 0 : undefined}
        data-slot="team-carousel-track"
        onScroll={measure}
        className={cn(
          "mt-10 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain rounded-2xl pb-2 [&::-webkit-scrollbar]:hidden",
          focusRing,
        )}
      >
        {members.map((member, index) => (
          <div
            key={member.name}
            role="group"
            aria-roledescription="slide"
            aria-label={text.position(index, count)}
            data-slot="team-carousel-slide"
            data-active={index === position.index || undefined}
            style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
            className="flex w-72 max-w-[85%] shrink-0 snap-start flex-col items-center rounded-2xl border border-border bg-background p-7 text-center"
          >
            <Avatar size="xl" className="size-20 border border-border">
              {member.avatar ? (
                <AvatarImage src={member.avatar} alt="" draggable={false} />
              ) : null}
              <AvatarFallback aria-hidden="true" className="text-xl">
                {initialsOf(member.name)}
              </AvatarFallback>
            </Avatar>
            <Name className="mt-6 text-lg font-medium">{member.name}</Name>
            <p className="text-sm text-muted-foreground">{member.role}</p>
            {member.experience ? (
              <>
                <Separator className="my-6 bg-linear-to-r from-background via-border to-background" />
                <p className="text-sm text-muted-foreground">{member.experience}</p>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
