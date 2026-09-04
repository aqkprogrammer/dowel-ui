import { bearerToken, checkLicense } from "~/lib/licensing";
import { licensedItems } from "~/lib/licensed-registry.generated";

/**
 * Serves a licensed registry item, to whoever is entitled to it.
 *
 * The free items are static files a CDN serves, which is why these are not:
 * anything that needs a decision made about it has to be somewhere a decision
 * can be made.
 *
 * Order matters here. The licence is checked *before* the name is looked up, so
 * an unauthenticated request cannot tell an item that exists from one that does
 * not — probing the 404s would otherwise enumerate the paid catalogue for free.
 */
export const dynamic = "force-dynamic";

const NO_STORE = {
  "content-type": "application/json",
  // `private` as well as `no-store`: a shared cache holding one customer's
  // authorised response and serving it to the next request is the whole
  // paywall, gone.
  "cache-control": "no-store, private",
} as const;

function deny(status: number, reason: string): Response {
  return Response.json({ error: reason }, { status, headers: NO_STORE });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
): Promise<Response> {
  const token = bearerToken(request);
  if (!token) {
    return deny(401, "This component requires a licence. Sign in with `login`.");
  }

  let license;
  try {
    license = await checkLicense(token);
  } catch {
    return deny(503, "The licence service is unavailable. Try again shortly.");
  }

  if (!license.valid) {
    // 402 rather than 403: the licence was understood and is not currently
    // payable-for. The CLI turns each of these into a different sentence.
    return deny(402, license.reason ?? "That licence is not active.");
  }

  // The free items are served as `<name>.json`, so the CLI asks for licensed
  // ones the same way. Both spellings are accepted: anyone mirroring this
  // registry will reasonably try either, and a 404 for a punctuation
  // difference is an afternoon lost.
  const { name: segment } = await context.params;
  const name = segment.replace(/\.json$/, "");
  const item = licensedItems[name];

  if (!item) {
    return deny(404, `No licensed component named "${name}".`);
  }

  // An entitlement list is optional: a provider selling one plan does not need
  // one, and `undefined` means the licence covers everything licensed.
  if (license.entitlements && !license.entitlements.includes(name)) {
    return deny(403, `"${name}" is not included in your plan.`);
  }

  return Response.json(item, { status: 200, headers: NO_STORE });
}
