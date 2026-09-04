import { bearerToken, checkLicense } from "~/lib/licensing";

/**
 * Answers whether a licence key is good.
 *
 * What the CLI calls at `login`, so a bad key fails at the moment someone pastes
 * it rather than days later during an install, with an error about a component.
 *
 * Never cached, by anything. A licence answer that is a minute stale is a
 * revoked key that still works for a minute; one cached by a CDN is a revoked
 * key that works until the cache is purged.
 */
export const dynamic = "force-dynamic";

const NO_STORE = {
  "content-type": "application/json",
  "cache-control": "no-store, private",
} as const;

export async function POST(request: Request): Promise<Response> {
  const token = bearerToken(request);

  if (!token) {
    return Response.json(
      { valid: false, reason: "No licence key was sent." },
      { status: 401, headers: NO_STORE },
    );
  }

  try {
    const license = await checkLicense(token);
    // 200 either way: the question was answered. Whether the answer is yes is
    // in the body, and a 4xx here would be the CLI reporting a transport
    // problem for something that is not one.
    return Response.json(license, { status: 200, headers: NO_STORE });
  } catch {
    // The provider being unreachable is this registry's problem, and a customer
    // told their licence is invalid because of it goes to support over an
    // outage they did not cause.
    return Response.json(
      { valid: false, reason: "The licence service is unavailable. Try again shortly." },
      { status: 503, headers: NO_STORE },
    );
  }
}

/** A GET here is a mistake worth naming rather than a 405 with no explanation. */
export function GET(): Response {
  return Response.json(
    { valid: false, reason: "Send the licence key as a POST with a bearer token." },
    { status: 405, headers: NO_STORE },
  );
}
