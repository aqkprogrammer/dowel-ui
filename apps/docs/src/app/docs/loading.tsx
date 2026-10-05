import { CosmicLoader } from "~/components/site/cosmic-loader";

/**
 * Loading inside the documentation shell: the header and sidebar stay, and
 * only the page area waits. Delayed, so a fast navigation shows nothing.
 */
export default function DocsLoading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="animate-[docs-rise_var(--duration-slower)_var(--ease-out-quint)_240ms_both]">
        <CosmicLoader />
      </div>
    </div>
  );
}
