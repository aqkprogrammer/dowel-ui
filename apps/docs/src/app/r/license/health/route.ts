import { resolveProvider } from "~/lib/licensing";
import { licensedItems } from "~/lib/licensed-registry.generated";

/**
 * Whether this registry can sell anything, and nothing more.
 *
 * The point is to answer "did the environment variables take?" without buying
 * a licence to find out. Configuring a paywall is otherwise a change whose
 * only feedback is a customer's failed install.
 *
 * It reports the provider's *name* and never a credential, not even a masked
 * one: a prefix is enough to confirm which token is in use, and confirming
 * which token is in use is exactly what an attacker wants. `unconfigured` here
 * is the honest answer that the paid catalogue is listed but unsellable.
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  const provider = resolveProvider();
  const licensed = Object.keys(licensedItems).sort();

  const ready = provider.name === "polar";

  return Response.json(
    {
      provider: provider.name,
      ready,
      licensedItems: licensed,
      detail: ready
        ? "Licensing is configured. Licence keys are validated upstream."
        : provider.name === "development"
          ? "Development keys only. This never applies in production."
          : "Licensing is not configured, so every licensed request is refused. " +
            "Set POLAR_ACCESS_TOKEN and POLAR_ORGANIZATION_ID, then redeploy.",
    },
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        // The answer depends on the environment the deployment is running
        // with, and a cached "not configured" outliving the fix is a support
        // question about a problem that was already solved.
        "cache-control": "no-store",
      },
    },
  );
}
