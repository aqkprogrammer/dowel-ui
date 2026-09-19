"use client";

// Ported from SmoothUI Team 1 (MIT, © 2024 Eduardo Calvo). See THIRD_PARTY_NOTICES.md.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar";
import { cn } from "@/lib/utils";

/*
 * A heading and a grid of people: a large portrait, a name, a role, and
 * optionally where they are and a line about them.
 *
 * Portraits are Dowel's Avatar stretched to a card-sized rectangle, so a
 * missing or failed photo falls back to initials instead of a broken image.
 * The source fades members up one after another as the grid scrolls in and
 * zooms a portrait on hover; both are CSS transitions here, with only a grid
 * that starts below the fold held back.
 *
 * The portrait's alt text is empty: the member's name is the very next thing
 * read, and "Photo of Ada Park, Ada Park" says it twice.
 */

const PREFIX = "dowel-team-grid";

const STYLES = `
[data-slot=team-grid][data-reveal] [data-slot=team-grid-member]{transition:opacity var(--duration-slower) var(--ease-out-quint),translate var(--duration-slower) var(--ease-out-quint);transition-delay:calc(var(--${PREFIX}-index,0) * 100ms * var(--motion-scale,1))}
[data-slot=team-grid][data-reveal=pending] [data-slot=team-grid-member]{opacity:0;translate:0 30px}
`;

export interface TeamGridMember {
  name: string;
  role: string;
  /** Portrait URL. Without one, or if it fails, the member's initials are shown. */
  avatar?: string;
  location?: string;
  bio?: ReactNode;
}

export const DEFAULT_TEAM_GRID: TeamGridMember[] = [
  { name: "Ada Park", role: "Founder and CEO", location: "Lisbon" },
  { name: "Tomás Reyes", role: "Head of Design", location: "Mexico City" },
  { name: "Noor Haddad", role: "Staff Engineer", location: "Amman" },
  { name: "Mika Lehtonen", role: "Product Manager", location: "Helsinki" },
];

export interface TeamGridBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  heading?: ReactNode;
  description?: ReactNode;
  members?: TeamGridMember[];
  /** Level of the section heading; each member's name is one level below. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

type Reveal = "static" | "pending" | "shown";

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Hides the content only if it starts below the fold, and shows it once it scrolls in. */
function useReveal<T extends HTMLElement>(ref: Ref<T> | undefined) {
  const node = useRef<T | null>(null);
  const [reveal, setReveal] = useState<Reveal>("static");

  useEffect(() => {
    const element = node.current;
    if (!element || typeof IntersectionObserver !== "function") return;
    if (prefersReducedMotion()) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    setReveal("pending");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        setReveal("shown");
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const setRef = useCallback(
    (element: T | null) => {
      node.current = element;
      assignRef(ref, element);
    },
    [ref],
  );

  return [setRef, reveal] as const;
}

/** Up to two initials, from the first and last words of a name. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** A heading over a grid of team members with large portraits. */
export function TeamGridBlock({
  heading = "Our team",
  description = "A small group of people who care about the details and about the people who use what we make.",
  members = DEFAULT_TEAM_GRID,
  headingLevel = 2,
  className,
  ref,
  ...props
}: TeamGridBlockProps) {
  const headingId = useId();
  const [setRef, reveal] = useReveal(ref);
  const Heading = `h${String(headingLevel)}` as "h2";
  const Name = `h${String(Math.min(headingLevel + 1, 6))}` as "h3";

  return (
    <section
      ref={setRef}
      aria-labelledby={headingId}
      data-slot="team-grid"
      data-reveal={reveal === "static" ? undefined : reveal}
      className={cn("mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8", className)}
      {...props}
    >
      <style href={PREFIX} precedence="dowel">
        {STYLES}
      </style>
      <div className="max-w-2xl">
        <Heading
          id={headingId}
          className="text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
        >
          {heading}
        </Heading>
        {description ? (
          <p className="mt-6 text-lg/8 text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <ul className="mt-16 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member, index) => (
          <li
            key={member.name}
            data-slot="team-grid-member"
            style={{ [`--${PREFIX}-index`]: index } as CSSProperties}
            className="group"
          >
            <Avatar className="aspect-[14/13] size-auto w-full rounded-2xl outline-1 -outline-offset-1 outline-border transition-[outline-color] duration-[var(--duration-normal)] group-hover:outline-border-strong">
              {member.avatar ? (
                <AvatarImage
                  src={member.avatar}
                  alt=""
                  draggable={false}
                  className="transition-[scale] duration-[var(--duration-slow)] ease-[var(--ease-out-quint)] group-hover:scale-105"
                />
              ) : null}
              <AvatarFallback aria-hidden="true" className="rounded-2xl text-4xl">
                {initialsOf(member.name)}
              </AvatarFallback>
            </Avatar>
            <Name className="mt-6 text-lg/8 font-semibold tracking-tight">{member.name}</Name>
            <p className="text-base/7 text-muted-foreground">{member.role}</p>
            {member.location ? (
              <p className="text-sm/6 text-muted-foreground">{member.location}</p>
            ) : null}
            {member.bio ? (
              <p className="mt-2 text-sm text-muted-foreground">{member.bio}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
