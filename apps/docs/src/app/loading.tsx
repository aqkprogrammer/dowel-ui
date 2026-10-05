import { BrandMark } from "~/components/brand-mark";
import { CosmicBackground } from "~/components/site/cosmic-background";
import { CosmicLoader } from "~/components/site/cosmic-loader";

/**
 * The full-page loading state: the brand, in its own sky.
 *
 * It fades in only after a beat, so a navigation that resolves quickly — which
 * on a statically built site is nearly all of them — never shows it at all.
 * It exists for the slow connection, not as a performance.
 */
export default function Loading() {
  return (
    <div className="relative isolate grid min-h-dvh place-items-center overflow-hidden">
      <CosmicBackground intensity="hero" seed={3} className="-z-10" />
      <div className="flex animate-[docs-rise_var(--duration-slower)_var(--ease-out-quint)_240ms_both] flex-col items-center gap-6">
        <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <BrandMark size={24} />
          Dowel
        </span>
        <CosmicLoader size="lg" />
      </div>
    </div>
  );
}
