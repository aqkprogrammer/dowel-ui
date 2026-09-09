"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

import { useTheme } from "~/components/theme-provider";

import type { AstraInput } from "./animation";
import { AstraControls } from "./astra-controls";
import styles from "./astra-hero.module.css";
import type { SceneStatus } from "./astra-scene";
import { DEFAULT_ASTRA_CONFIG, type AstraConfig } from "./config";
import { ASTRA_EVENTS } from "./events";
import { createFrameCoordinator, type FrameCoordinator } from "./frame-coordinator";
import { detectRendererProfile, type RendererProfile } from "./profile";
import {
  resolveAstraShape,
  sampleShapeElement,
  type AstraShape,
  type AstraShapeId,
  type SampledShape,
} from "./shapes";

/**
 * The page-side half of the star field.
 *
 * `AstraExperience` wraps the whole site, once, in the root layout. Each page
 * places an `AstraHero` where the galaxy should be — filling the first
 * viewport, or as a banner under the header — and, optionally,
 * `AstraScrollCue`s further down where the stars should gather into an
 * outline. Everything else here is measuring: where those elements are
 * relative to the scroll position, turned into the inputs the scene animates
 * towards.
 *
 * The scene itself is loaded on the client only, and only once a hero exists.
 */

const AstraScene = dynamic(() => import("./astra-scene"), { ssr: false, loading: () => null });

/* -------------------------------------------------------------------------- */
/* Registration                                                                */
/* -------------------------------------------------------------------------- */

export type AstraHeroVariant = "page" | "banner";

interface HeroRegistration {
  element: HTMLElement;
  variant: AstraHeroVariant;
  leftLabel: string;
  rightLabel: string;
  scrollLabel?: string;
  /** How strongly the page's own background veils the field below the hero. */
  veil: number;
}

interface CueRegistration {
  element: HTMLElement;
  shape: AstraShape | null;
}

interface AstraContextValue {
  registerHero: (key: symbol, registration: HeroRegistration) => () => void;
  registerCue: (key: symbol, registration: CueRegistration) => () => void;
}

const AstraContext = createContext<AstraContextValue | null>(null);

function byDocumentOrder(a: { element: Element }, b: { element: Element }): number {
  if (a.element === b.element) return 0;
  return a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : 1;
}

/* -------------------------------------------------------------------------- */
/* Small hooks                                                                 */
/* -------------------------------------------------------------------------- */

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

let cachedProfile: RendererProfile | null = null;

/** Detected once per page load; the answer does not change while it is open. */
function useRendererProfile(): RendererProfile | null {
  return useSyncExternalStore(
    () => () => {},
    () => (cachedProfile ??= detectRendererProfile()),
    () => null,
  );
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                      */
/* -------------------------------------------------------------------------- */

interface RevealingLabelProps {
  className: string;
  text: string;
  direction: "left" | "right";
  delay: number;
  duration: number;
  stagger: number;
}

/** A word revealed letter by letter, from the outside in, and again on replay. */
function RevealingLabel({
  className,
  text,
  direction,
  delay,
  duration,
  stagger,
}: RevealingLabelProps) {
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    const bump = () => setGeneration((value) => value + 1);
    window.addEventListener(ASTRA_EVENTS.replay, bump);
    return () => window.removeEventListener(ASTRA_EVENTS.replay, bump);
  }, []);
  const letters = Array.from(text);
  return (
    <p aria-hidden="true" className={className}>
      {letters.map((letter, index) => {
        const order = direction === "left" ? letters.length - index - 1 : index;
        return (
          <span
            key={`${generation}-${index}`}
            className={styles.labelLetter}
            style={
              {
                "--astra-label-delay": `${delay + order * stagger}s`,
                "--astra-label-duration": `${duration}s`,
                "--astra-label-shift": direction === "left" ? "-44px" : "44px",
              } as CSSProperties
            }
          >
            {letter === " " ? " " : letter}
          </span>
        );
      })}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Measuring                                                                   */
/* -------------------------------------------------------------------------- */

interface Bounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Viewport {
  width: number;
  height: number;
}

interface PlacedShape extends SampledShape {
  bounds: Bounds;
  holdAtRangeEnd: boolean;
}

interface Layout {
  heroBounds: Bounds;
  cues: { bounds: Bounds; shape: AstraShape | null }[];
  rangeBounds: Bounds | null;
  introBounds: Bounds | null;
  title: { element: HTMLElement; bounds: Bounds; padding: number; distance: number } | null;
  canvas: Bounds;
  shapes: PlacedShape[];
}

function smootherstep(value: number, edge0: number, edge1: number): number {
  const t = Math.min(Math.max((value - edge0) / (edge1 - edge0), 0), 1);
  return t * t * t * (t * (6 * t - 15) + 10);
}

function formatFraction(value: number): string {
  return String(Math.round(1e4 * Math.min(1, Math.max(0, value))) / 1e4);
}

/** Text fades over the first stretch; the field disperses over a longer one. */
function scrollState(offset: number, config: AstraConfig, reducedMotion: boolean) {
  if (!config.scrollEffects) return { textOpacity: 1, progress: 0 };
  const travelled = offset - Math.max(config.scrollStartOffset, 0);
  const fade = Math.min(Math.max(travelled / Math.max(config.scrollTextFadeDistance, 1), 0), 1);
  const progress = Math.max(travelled / Math.max(config.scrollDisperseDistance, 1), 0);
  if (reducedMotion) {
    return { textOpacity: fade < 0.5 ? 1 : 0, progress: Math.min(progress, 1) < 0.5 ? 0 : 1 };
  }
  return { textOpacity: 1 - fade * fade * fade * (fade * (6 * fade - 15) + 10), progress };
}

interface OrchestrationArgs {
  backdropRef: RefObject<HTMLDivElement | null>;
  chromeRef: RefObject<HTMLDivElement | null>;
  veilRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  config: AstraConfig;
  cues: CueRegistration[];
  hero: HeroRegistration;
  inputRef: RefObject<AstraInput>;
  reducedMotion: boolean;
  runtimeConfigRef: RefObject<AstraConfig>;
  sceneContinuous: boolean;
}

/**
 * Turns the document into scene inputs, once per frame while anything moves.
 *
 * Layout (where the hero, the cues and the copy are) is measured only when
 * something says it changed — a resize, fonts arriving, content growing. The
 * scroll position is read every frame it runs, cheaply.
 */
function useAstraOrchestration({
  backdropRef,
  chromeRef,
  veilRef,
  contentRef,
  config,
  cues,
  hero,
  inputRef,
  reducedMotion,
  runtimeConfigRef,
  sceneContinuous,
}: OrchestrationArgs): FrameCoordinator {
  // The coordinator outlives every effect below; the effect that owns the
  // current layout hands it the measure function to run each frame.
  const [coordinator] = useState(() => createFrameCoordinator());
  // Deactivate rather than dispose on unmount: in development React runs the
  // effects twice, and the same coordinator must come back to life.
  useEffect(() => () => coordinator.setActive(false), [coordinator]);

  const latest = useRef({ config, cues, hero, reducedMotion, sceneContinuous });
  useLayoutEffect(() => {
    latest.current = { config, cues, hero, reducedMotion, sceneContinuous };
  });
  const relayoutRef = useRef<(shapes: boolean) => void>(() => {});

  useLayoutEffect(() => {
    let disposed = false;
    let layoutDirty = true;
    let shapesDirty = true;
    let viewportDirty = true;
    let forced = true;
    let layout: Layout | null = null;
    let sampledShapes: PlacedShape[] = [];
    let lastScrollTop = NaN;
    let lastScrollLeft = NaN;
    let parallaxTarget: HTMLElement | null = null;
    let parallaxValue = "";
    let parallaxPixels = 0;

    const backdrop = backdropRef.current;
    const chrome = chromeRef.current;
    const veil = veilRef.current;

    const scroller = () => document.scrollingElement ?? document.documentElement;
    const rect = (element: Element, scrollTop: number, scrollLeft: number): Bounds => {
      const r = element.getBoundingClientRect();
      return {
        top: r.top + scrollTop,
        left: r.left + scrollLeft,
        width: r.width,
        height: r.height,
      };
    };

    const measureViewport = (): Viewport => {
      const height = window.innerHeight || 1;
      const width = window.innerWidth || 1;
      inputRef.current.centerCore = width < 768;
      return { width, height };
    };

    const releaseParallax = () => {
      if (parallaxTarget) {
        parallaxTarget.style.removeProperty("--astra-title-parallax-y");
        parallaxTarget.classList.remove(styles.titleParallax ?? "");
      }
      parallaxTarget = null;
      parallaxValue = "";
      parallaxPixels = 0;
    };

    const measureLayout = (viewport: Viewport): Layout => {
      const { config: current, cues: currentCues, hero: currentHero } = latest.current;
      const { scrollTop, scrollLeft } = scroller();
      const content = contentRef.current;
      const heroBounds = rect(currentHero.element, scrollTop, scrollLeft);
      const cueLayout = currentCues.map((cue) => ({
        bounds: rect(cue.element, scrollTop, scrollLeft),
        shape: cue.shape,
      }));

      if (shapesDirty) {
        sampledShapes = currentCues.flatMap((cue, index) => {
          if (!cue.shape) return [];
          const sampled = sampleShapeElement(cue.element, `${cue.shape.id}:${index}`);
          return sampled
            ? [
                {
                  ...sampled,
                  bounds: rect(cue.element, scrollTop, scrollLeft),
                  holdAtRangeEnd: index === currentCues.length - 1,
                },
              ]
            : [];
        });
        shapesDirty = false;
      } else {
        sampledShapes = sampledShapes.map((shape) => ({
          ...shape,
          bounds: rect(shape.element, scrollTop, scrollLeft),
        }));
      }

      const intro = content?.querySelector<HTMLElement>("[data-astra-intro]") ?? null;
      const titleElement = content?.querySelector<HTMLElement>("[data-astra-title]") ?? null;
      if (titleElement !== parallaxTarget) {
        releaseParallax();
        if (titleElement) {
          parallaxTarget = titleElement;
          titleElement.classList.add(styles.titleParallax ?? "");
        }
      }
      let title: Layout["title"] = null;
      if (titleElement) {
        const bounds = rect(titleElement, scrollTop, scrollLeft);
        const mobile = viewport.width < 768;
        title = {
          element: titleElement,
          bounds: { ...bounds, top: bounds.top - parallaxPixels },
          padding: 24,
          distance: current.scrollEffects ? (mobile ? 144 : 240) : 0,
        };
      }

      const canvasRect = backdrop?.getBoundingClientRect();
      const canvas: Bounds =
        canvasRect && canvasRect.width > 0 && canvasRect.height > 0
          ? {
              top: 0,
              left: canvasRect.left,
              width: canvasRect.width,
              height: canvasRect.height,
            }
          : { top: 0, left: 0, width: viewport.width, height: viewport.height };

      return {
        heroBounds,
        cues: cueLayout,
        rangeBounds: content ? rect(content, scrollTop, scrollLeft) : null,
        introBounds: intro ? rect(intro, scrollTop, scrollLeft) : null,
        title,
        canvas,
        shapes: sampledShapes,
      };
    };

    let viewport = measureViewport();

    const resetPointer = () => {
      const pointer = inputRef.current.pointer;
      pointer.active = false;
      pointer.pressed = false;
      pointer.reset = true;
    };

    const measure = (): boolean => {
      const {
        config: current,
        reducedMotion: reduced,
        sceneContinuous: continuous,
        hero: currentHero,
      } = latest.current;
      const banner = currentHero.variant === "banner";
      const element = scroller();
      const scrollTop = element.scrollTop;
      const scrollLeft = element.scrollLeft;
      const scrolled = scrollTop !== lastScrollTop || scrollLeft !== lastScrollLeft;
      const input = inputRef.current;
      input.scrolling = scrolled;
      input.reducedMotion = reduced;

      if (!layoutDirty && !viewportDirty && !forced && !scrolled && layout) return false;
      if (viewportDirty) {
        viewport = measureViewport();
        viewportDirty = false;
        layoutDirty = true;
      }
      if (layoutDirty || !layout) {
        layout = measureLayout(viewport);
        layoutDirty = false;
      }
      const current_layout = layout;
      const heroBounds = current_layout.heroBounds;
      const viewportBottom = scrollTop + viewport.height;
      const heroVisible =
        heroBounds.top + heroBounds.height > scrollTop && heroBounds.top < viewportBottom;

      // Copy bounds, for the rails. A banner has no copy inside it.
      input.contentBounds =
        !banner && current_layout.title
          ? {
              left: Math.max(
                0,
                (current_layout.title.bounds.left -
                  current_layout.title.padding -
                  scrollLeft -
                  current_layout.canvas.left) /
                  current_layout.canvas.width,
              ),
              right: Math.min(
                1,
                (current_layout.title.bounds.left +
                  current_layout.title.bounds.width -
                  scrollLeft +
                  current_layout.title.padding -
                  current_layout.canvas.left) /
                  current_layout.canvas.width,
              ),
            }
          : null;

      // The cue in view, and how strongly its outline should hold.
      const shape = input.shape;
      shape.strength = 0;
      if (!banner && current.scrollEffects && !reduced) {
        const range = current_layout.rangeBounds;
        const maxScrollTop = range
          ? Math.max(0, range.top + range.height - viewport.height)
          : undefined;
        const clampedTop =
          maxScrollTop === undefined ? scrollTop : Math.min(scrollTop, maxScrollTop);
        let chosen: PlacedShape | undefined;
        for (const candidate of current_layout.shapes) {
          const travelled =
            (clampedTop + viewport.height - candidate.bounds.top) /
            Math.max(viewport.height + candidate.bounds.height, 1);
          const hold = candidate.holdAtRangeEnd ? 1 : 1 - smootherstep(travelled, 0.5, 0.86);
          const strength = smootherstep(travelled, 0, 0.36) * hold;
          if (strength > shape.strength) {
            chosen = candidate;
            shape.strength = strength;
          }
        }
        if (chosen) {
          const width =
            chosen.bounds.width / Math.max(chosen.bounds.height, 1) > chosen.aspectRatio
              ? chosen.bounds.height * chosen.aspectRatio
              : chosen.bounds.width;
          const height = width / chosen.aspectRatio;
          shape.centerNdc.x =
            ((chosen.bounds.left - scrollLeft + 0.5 * chosen.bounds.width) /
              current_layout.canvas.width) *
              2 -
            1;
          shape.centerNdc.y =
            1 -
            ((chosen.bounds.top - clampedTop + 0.5 * chosen.bounds.height) /
              current_layout.canvas.height) *
              2;
          shape.sizeNdc.x = (width / current_layout.canvas.width) * 2;
          shape.sizeNdc.y = (height / current_layout.canvas.height) * 2;
          shape.id = chosen.id;
          shape.samples = chosen.samples;
        }
      }

      // Scroll progress from the top of the hero.
      const offset = Math.max(0, scrollTop - heroBounds.top);
      const scroll = scrollState(offset, current, reduced);
      input.progress = scroll.progress;
      input.scatterProgress = null;
      input.tiltProgress = null;
      const intro = current_layout.introBounds;
      if (!banner && intro && current.scrollEffects && !reduced) {
        const begin = intro.top - 0.66 * viewport.height;
        const end = intro.top + 0.5 * intro.height - 0.5 * viewport.height;
        input.scatterProgress = Math.min(1, Math.max(0, (scrollTop - begin) / (end - begin)));
        input.tiltProgress = Math.min(1, offset / Math.max(1, end - heroBounds.top));
      }
      input.heroViewportHeight = banner ? heroBounds.height : null;
      input.heroViewportTop = 0;

      // The intro heading drifts against the scroll a little.
      if (!banner && current_layout.title) {
        const { bounds, distance, element: target } = current_layout.title;
        let pixels = 0;
        if (!reduced && distance > 0 && bounds.height >= 0) {
          const center = bounds.top + bounds.height / 2;
          const halfRange = (viewport.height + bounds.height) / 2;
          pixels = Math.round(
            Math.min(
              1,
              Math.max(-1, (center - (scrollTop + viewport.height / 2)) / halfRange),
            ) * Math.round(distance / 2),
          );
        }
        const value = reduced ? "" : `${pixels}px`;
        if (value !== parallaxValue) {
          if (value) target.style.setProperty("--astra-title-parallax-y", value);
          else target.style.removeProperty("--astra-title-parallax-y");
          parallaxValue = value;
          parallaxPixels = reduced ? 0 : pixels;
        }
      }

      input.starsOpacity = 1;
      coordinator.setSceneContinuous(continuous && current.animationPlaying && !reduced);

      // The field is the background of the whole site: fixed to the viewport,
      // present on every page and for its full length. What changes is how much
      // of the page's own colour is laid over it — none across the hero, full
      // below it, so text is read on the page's background rather than on a
      // star field, and lifting again wherever a cue's outline is forming.
      coordinator.setSceneActive(true);

      if (backdrop && backdrop.dataset.astraActive !== "true") {
        backdrop.dataset.astraActive = "true";
      }
      if (veil) {
        // Before the stylesheet has landed the hero has no height yet, and a
        // veil drawn from the top of the page would cover the field itself.
        const top =
          heroBounds.height < 1
            ? "100%"
            : `${Math.max(0, Math.round(heroBounds.top + heroBounds.height - scrollTop))}px`;
        const alpha = formatFraction(currentHero.veil * (1 - shape.strength));
        if (veil.style.getPropertyValue("--astra-veil-top") !== top) {
          veil.style.setProperty("--astra-veil-top", top);
        }
        if (veil.style.getPropertyValue("--astra-veil-alpha") !== alpha) {
          veil.style.setProperty("--astra-veil-alpha", alpha);
        }
      }
      if (chrome) {
        // The labels belong to the hero, and leave with it.
        const copyOpacity = heroVisible ? scroll.textOpacity : 0;
        const visibility = copyOpacity > 0.01 ? "visible" : "hidden";
        const value = formatFraction(copyOpacity);
        const transform = banner ? `translate3d(0, ${heroBounds.top - scrollTop}px, 0)` : "";
        const heightStyle = banner ? `${Math.max(1, Math.round(heroBounds.height))}px` : "";
        if (chrome.style.visibility !== visibility) chrome.style.visibility = visibility;
        if (chrome.style.transform !== transform) chrome.style.transform = transform;
        if (chrome.style.height !== heightStyle) chrome.style.height = heightStyle;
        if (chrome.style.getPropertyValue("--astra-copy-opacity") !== value) {
          chrome.style.setProperty("--astra-copy-opacity", value);
        }
      }

      lastScrollTop = scrollTop;
      lastScrollLeft = scrollLeft;
      forced = false;
      return scrolled;
    };
    coordinator.setMeasure(() => (disposed ? false : measure()));

    const relayout = (shapes: boolean) => {
      if (disposed) return;
      layoutDirty = true;
      viewportDirty = true;
      shapesDirty ||= shapes;
      forced = true;
      coordinator.invalidate();
    };
    relayoutRef.current = relayout;
    const force = () => {
      if (disposed) return;
      forced = true;
      coordinator.invalidate();
    };
    const onScroll = () => {
      if (disposed) return;
      const element = scroller();
      if (element.scrollTop !== lastScrollTop || element.scrollLeft !== lastScrollLeft) force();
    };
    const SCROLL_KEYS = new Set([
      " ",
      "ArrowDown",
      "ArrowUp",
      "End",
      "Home",
      "PageDown",
      "PageUp",
      "Spacebar",
    ]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !event.defaultPrevented &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        SCROLL_KEYS.has(event.key)
      ) {
        force();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") resetPointer();
      else relayout(false);
    };
    const onPageShow = () => relayout(false);
    const onPageHide = () => resetPointer();
    const onResize = () => relayout(false);

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => relayout(false));
    const content = contentRef.current;
    if (content) observer?.observe(content);
    observer?.observe(document.documentElement);
    if (document.body) observer?.observe(document.body);
    const visualViewport = window.visualViewport;

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", force, { capture: true, passive: true });
    window.addEventListener("touchstart", force, { capture: true, passive: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("focusin", force, { capture: true });
    window.addEventListener("hashchange", force);
    window.addEventListener("popstate", force);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    visualViewport?.addEventListener("resize", onResize, { passive: true });
    visualViewport?.addEventListener("scroll", onResize, { passive: true });
    document.fonts?.ready.then(() => relayout(false)).catch(() => {});

    coordinator.setActive(true);
    measure();
    coordinator.invalidate();

    return () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", force, { capture: true });
      window.removeEventListener("touchstart", force, { capture: true });
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("focusin", force, { capture: true });
      window.removeEventListener("hashchange", force);
      window.removeEventListener("popstate", force);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      visualViewport?.removeEventListener("resize", onResize);
      visualViewport?.removeEventListener("scroll", onResize);
      observer?.disconnect();
      releaseParallax();
      coordinator.setSceneActive(false);
      coordinator.setMeasure(null);
      relayoutRef.current = () => {};
    };
  }, [backdropRef, chromeRef, veilRef, contentRef, coordinator, inputRef, runtimeConfigRef]);

  // Cues and the hero can change without remounting; re-measure when they do.
  useEffect(() => {
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => relayoutRef.current(false));
    observer?.observe(hero.element);
    for (const cue of cues) observer?.observe(cue.element);
    return () => observer?.disconnect();
  }, [cues, hero.element]);

  useEffect(() => {
    relayoutRef.current(true);
  }, [cues, config, hero]);

  useEffect(() => {
    if (reducedMotion) {
      inputRef.current.pointer.active = false;
      inputRef.current.pointer.pressed = false;
      inputRef.current.pointer.reset = true;
    }
    relayoutRef.current(false);
  }, [inputRef, reducedMotion, sceneContinuous]);

  return coordinator;
}

/* -------------------------------------------------------------------------- */
/* The stage: backdrop + chrome                                                */
/* -------------------------------------------------------------------------- */

interface StageProps {
  config: AstraConfig;
  contentRef: RefObject<HTMLDivElement | null>;
  cues: CueRegistration[];
  experienceRef: RefObject<HTMLDivElement | null>;
  hero: HeroRegistration;
  interactionLabel: string;
  replayLabel: string;
  ambientColor: string;
}

function createInput(): AstraInput {
  return {
    centerCore: false,
    contentBounds: null,
    heroViewportHeight: null,
    heroViewportTop: 0,
    reducedMotion: true,
    progress: 0,
    scatterProgress: null,
    tiltProgress: null,
    starsOpacity: 1,
    scrolling: false,
    returning: false,
    rotation: { x: 0, y: 0 },
    pointer: { active: false, pressed: false, reset: false, x: 0, y: 0 },
    shape: {
      centerNdc: { x: 0, y: 0 },
      id: null,
      samples: null,
      sizeNdc: { x: 0, y: 0 },
      strength: 0,
    },
  };
}

const AstraStage = memo(function AstraStage({
  config,
  contentRef,
  cues,
  experienceRef,
  hero,
  interactionLabel,
  replayLabel,
  ambientColor,
}: StageProps) {
  const profile = useRendererProfile();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const backdropRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<AstraInput>(createInput());
  const runtimeConfigRef = useRef<AstraConfig>(config);
  const [restartKey, setRestartKey] = useState(0);
  const [failedProfile, setFailedProfile] = useState<RendererProfile | null>(null);

  const sceneEnabled = profile !== null && profile.available && failedProfile !== profile;
  const sceneContinuous = sceneEnabled && profile.continuousMotion;

  const coordinator = useAstraOrchestration({
    backdropRef,
    chromeRef,
    veilRef,
    contentRef,
    config,
    cues,
    hero,
    inputRef,
    reducedMotion,
    runtimeConfigRef,
    sceneContinuous,
  });

  const onStatusChange = useCallback(
    (status: SceneStatus) => {
      if (status === "fallback") setFailedProfile(profile);
    },
    [profile],
  );
  const onRestart = useCallback(() => setRestartKey((value) => value + 1), []);

  useEffect(() => {
    const element = experienceRef.current;
    if (!element) return;
    const isStatic = profile !== null && !sceneEnabled;
    element.dataset.astraStatic = String(isStatic);
    return () => {
      delete element.dataset.astraStatic;
    };
  }, [experienceRef, profile, sceneEnabled]);

  const ambientStyle = {
    "--astra-ambient-color": ambientColor,
    "--astra-ambient-fade-duration": `${config.convergeDuration}s`,
    "--astra-ambient-opacity": 0.55,
  } as CSSProperties;

  return (
    <>
      <div
        ref={backdropRef}
        aria-hidden="true"
        data-astra-backdrop="true"
        className="pointer-events-none fixed inset-0 z-0 h-lvh w-full overflow-hidden"
        // Black from the first paint: in a light theme the whole backdrop is
        // inverted, so this is the page's white until the canvas has drawn.
        style={{ background: "#000" }}
      >
        {sceneEnabled && (
          <AstraScene
            config={config}
            coordinator={coordinator}
            inputRef={inputRef}
            runtimeConfigRef={runtimeConfigRef}
            profile={profile}
            restartKey={restartKey}
            onStatusChange={onStatusChange}
            onRestart={onRestart}
          />
        )}
        <div className={styles.ambientBackdrop} style={ambientStyle} />
        <div className={styles.vignette} />
      </div>
      {/* Outside the backdrop, so the inversion that flips the field for a
          light theme does not flip the page's own colour laid over it. */}
      <div ref={veilRef} aria-hidden="true" className={styles.veil} />
      <div className="pointer-events-none fixed inset-0 z-20 h-full w-full overflow-hidden">
        <div
          ref={chromeRef}
          className={styles.fixedChrome}
          style={{ "--astra-copy-opacity": 0, visibility: "hidden" } as CSSProperties}
        >
          <RevealingLabel
            key={`left-${hero.leftLabel}`}
            className={`${styles.label} ${styles.labelLeft}`}
            text={hero.leftLabel}
            direction="left"
            delay={0.85}
            duration={1}
            stagger={0.1}
          />
          <RevealingLabel
            key={`right-${hero.rightLabel}`}
            className={`${styles.label} ${styles.labelRight}`}
            text={hero.rightLabel}
            direction="right"
            delay={0.85}
            duration={1}
            stagger={0.1}
          />
          {hero.scrollLabel && <p className={styles.scrollLabel}>{hero.scrollLabel}</p>}
          <AstraControls
            enabled={false}
            interactionLabel={interactionLabel}
            replayLabel={replayLabel}
            showReplay
          />
        </div>
      </div>
    </>
  );
});

/* -------------------------------------------------------------------------- */
/* Public components                                                           */
/* -------------------------------------------------------------------------- */

export interface AstraExperienceProps {
  children: ReactNode;
  interactionLabel?: string;
  replayLabel?: string;
  /** Colour of the soft glow behind the field. */
  ambientColor?: string;
  config?: AstraConfig;
}

/**
 * Wraps the site. Renders nothing of its own until an `AstraHero` somewhere
 * inside it mounts; when the hero changes — a navigation to another page —
 * the scene is rebuilt for it, so every page gets its opening.
 */
export function AstraExperience({
  children,
  interactionLabel = "Drag or use arrow keys to rotate the star field",
  replayLabel = "Replay the opening animation",
  ambientColor = "#23435F",
  config = DEFAULT_ASTRA_CONFIG,
}: AstraExperienceProps) {
  const heroes = useRef(new Map<symbol, HeroRegistration>());
  const cueMap = useRef(new Map<symbol, CueRegistration>());
  const experienceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [registrations, setRegistrations] = useState<{
    hero: HeroRegistration | undefined;
    cues: CueRegistration[];
  }>({ hero: undefined, cues: [] });

  const refresh = useCallback(() => {
    const ordered = [...heroes.current.values()].sort(byDocumentOrder);
    const hero = ordered[0];
    const next = ordered[1];
    // Only cues between the hero and any second hero belong to this one.
    const cues = hero
      ? [...cueMap.current.values()]
          .sort(byDocumentOrder)
          .filter(
            (cue) =>
              byDocumentOrder(hero, cue) < 0 && (!next || byDocumentOrder(cue, next) < 0),
          )
      : [];
    setRegistrations({ hero, cues });
  }, []);

  const value = useMemo<AstraContextValue>(
    () => ({
      registerHero: (key, registration) => {
        heroes.current.set(key, registration);
        refresh();
        return () => {
          heroes.current.delete(key);
          refresh();
        };
      },
      registerCue: (key, registration) => {
        cueMap.current.set(key, registration);
        refresh();
        return () => {
          cueMap.current.delete(key);
          refresh();
        };
      },
    }),
    [refresh],
  );

  const { hero, cues } = registrations;

  // The field is rendered bright-on-black and inverted by CSS for a light
  // theme, so every colour in it reverses at once — background, stars, glow
  // and flares — and the page's own tokens keep working over the top.
  const { resolvedDark } = useTheme();
  useEffect(() => {
    document.documentElement.dataset.astraTheme = resolvedDark ? "dark" : "light";
  }, [resolvedDark]);

  return (
    <AstraContext.Provider value={value}>
      <div
        ref={experienceRef}
        data-astra-experience="true"
        className="relative isolate min-h-screen"
      >
        {hero && (
          <AstraStage
            key={hero.element.dataset.astraHeroKey}
            config={config}
            contentRef={contentRef}
            cues={cues}
            experienceRef={experienceRef}
            hero={hero}
            interactionLabel={interactionLabel}
            replayLabel={replayLabel}
            ambientColor={ambientColor}
          />
        )}
        <div ref={contentRef} className="relative z-10 min-w-0">
          {children}
        </div>
      </div>
    </AstraContext.Provider>
  );
}

export interface AstraHeroProps {
  /** The word on the left of the galaxy. */
  leftLabel: string;
  /** The word on the right. */
  rightLabel: string;
  scrollLabel?: string;
  /**
   * `page` opens on a full viewport of stars; `banner` is a shorter band under
   * the header. Either way the field stays behind the rest of the page.
   */
  variant?: AstraHeroVariant;
  /**
   * How much of the page's own background is laid over the field below the
   * hero, 0–1. Text-heavy pages want most of it; a page whose content is laid
   * out around the stars wants less.
   */
  veil?: number;
  children?: ReactNode;
  className?: string;
  interactionLabel?: string;
}

/** The opening viewport. The galaxy fills it; a drag anywhere turns the field. */
export function AstraHero({
  leftLabel,
  rightLabel,
  scrollLabel,
  variant = "page",
  veil = 0.88,
  children,
  className,
  interactionLabel = "Drag or use arrow keys to rotate the star field",
}: AstraHeroProps) {
  const context = useContext(AstraContext);
  const ref = useRef<HTMLElement>(null);
  const key = useRef(Symbol("astra-hero"));
  // Identifies this hero to the stage so a navigation to a new one rebuilds
  // the scene. useId, so the server and client agree on it.
  const heroKey = useId();
  useLayoutEffect(() => {
    if (context && ref.current) {
      return context.registerHero(key.current, {
        element: ref.current,
        variant,
        leftLabel,
        rightLabel,
        scrollLabel,
        veil: Math.min(1, Math.max(0, veil)),
      });
    }
  }, [context, variant, leftLabel, rightLabel, scrollLabel, veil]);
  const size = variant === "banner" ? "min-h-[52svh]" : "min-h-svh";
  return (
    <section
      ref={ref}
      data-astra-hero={variant}
      data-astra-hero-key={heroKey}
      className={["relative w-full", size, className].filter(Boolean).join(" ")}
    >
      <div className={styles.layout}>
        <AstraControls enabled interactionLabel={interactionLabel} />
        {children}
      </div>
    </section>
  );
}

export interface AstraScrollCueProps {
  /** Which outline the stars gather into here; none makes a plain waypoint. */
  shape?: AstraShapeId;
  /** Height of the cue as a fraction of the viewport, 40–120. */
  heightVh?: number;
  /** Widest the outline gets, in pixels. */
  maxWidth?: number;
  interactionLabel?: string;
}

/**
 * A point in the page the field responds to. With a shape, the stars form its
 * outline as it scrolls through the middle of the viewport; without, it only
 * marks where the next stretch of the page begins — and the last one is where
 * the backdrop lets go.
 */
export function AstraScrollCue({
  shape: shapeId,
  heightVh = 80,
  maxWidth = 576,
  interactionLabel = "Drag or use arrow keys to rotate the stars",
}: AstraScrollCueProps) {
  const context = useContext(AstraContext);
  const ref = useRef<HTMLDivElement>(null);
  const key = useRef(Symbol("astra-cue"));
  const shape = resolveAstraShape(shapeId);
  const height = Math.min(120, Math.max(40, heightVh));
  const width = Math.min(960, Math.max(240, maxWidth));

  useLayoutEffect(() => {
    if (context && ref.current)
      return context.registerCue(key.current, { element: ref.current, shape });
  }, [context, shape]);

  if (!shape) {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className="pointer-events-none h-px w-full"
        data-astra-scroll-cue="true"
      />
    );
  }
  return (
    <div
      ref={ref}
      className={styles.shapeCue}
      data-astra-path-shape={shape.id}
      data-astra-scroll-cue="true"
      style={
        {
          "--astra-shape-height": `calc(${height / 100} * var(--astra-viewport-height, 100vh))`,
          "--astra-shape-max-width": `${width}px`,
        } as CSSProperties
      }
    >
      <svg
        aria-hidden="true"
        className={styles.shapeTarget}
        fill="none"
        viewBox={`0 0 ${shape.viewBox.width} ${shape.viewBox.height}`}
      >
        {shape.paths.map((d) => (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            strokeWidth={shape.strokeWidth}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <AstraControls enabled interactionLabel={interactionLabel} />
    </div>
  );
}

/**
 * Wraps the site header. The field is behind every page, so the header always
 * sits over it: the bar goes translucent and blurred rather than solid, and
 * keeps the page's own colours — which read correctly either way, because the
 * field is inverted to match the theme.
 */
export function AstraHeaderShell({ children }: { children: ReactNode }) {
  return <div className="astra-overlay contents">{children}</div>;
}
