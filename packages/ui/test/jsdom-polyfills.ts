/**
 * Browser APIs jsdom does not implement that Radix primitives depend on.
 *
 * Each of these is a hard requirement, not a nicety: without them the overlay
 * primitives throw on mount rather than degrading, so component tests could not
 * run at all. They are stubs — they let the component mount and be driven, but
 * they do not model layout. Anything that genuinely depends on measured
 * geometry (collision-aware placement, for example) belongs in a real browser,
 * which is what the Storybook a11y run and Phase 9's visual pass are for.
 */

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!("DOMRect" in globalThis)) {
  globalThis.DOMRect = class DOMRect {
    constructor(
      public x = 0,
      public y = 0,
      public width = 0,
      public height = 0,
    ) {}
    get top() {
      return this.y;
    }
    get left() {
      return this.x;
    }
    get right() {
      return this.x + this.width;
    }
    get bottom() {
      return this.y + this.height;
    }
    static fromRect(other?: DOMRectInit) {
      return new DOMRect(other?.x, other?.y, other?.width, other?.height);
    }
    toJSON() {
      return { ...this };
    }
  };
}

// Radix menus call these while managing pointer interactions.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom implements neither the Web Animations API nor animation events, so
// Radix's Presence never sees an exit animation finish. Reporting no running
// animations makes exits resolve immediately, which is what a test wants.
if (!Element.prototype.getAnimations) {
  Element.prototype.getAnimations = () => [];
}
