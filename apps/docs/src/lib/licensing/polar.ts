import { invalid, type License, type Environment, type LicenseProvider } from "./provider";

/**
 * Licence validation through Polar.
 *
 * Polar is the merchant of record and the issuer, so a key is only ever
 * validated by asking it. Nothing is derived locally from the shape of a key:
 * a key that "looks right" is not a key that has been paid for, and a format
 * check that passes for an expired licence is worse than no check.
 *
 * Configured entirely by environment. There are no credentials in this
 * repository and there must not be.
 */

const DEFAULT_API = "https://api.polar.sh";

/**
 * The server-side validation endpoint, not the customer-portal one.
 *
 * Polar publishes two. `/v1/customer-portal/license-keys/validate` takes no
 * authentication and exists so a desktop or mobile client can check a key
 * without shipping a secret; it is rate-limited to a few requests a second
 * precisely because anyone may call it. This runs on a server that holds an
 * organisation token, so it uses the authenticated one — which is not
 * throttled at a public client's rate, and which cannot be called by anybody
 * who has read our source.
 */
const VALIDATE_PATH = "/v1/license-keys/validate";

export interface PolarConfig {
  accessToken: string;
  apiUrl: string;
  /** Which organisation's keys are accepted. Required by the endpoint. */
  organizationId: string;
}

/**
 * Both variables, or nothing.
 *
 * `organization_id` is required by the validation endpoint, so a deployment
 * with a token and no organisation id would fail every check at runtime with
 * an error about a malformed request — reported to a customer as a licence
 * problem. Treating it as unconfigured instead means the failure names itself:
 * the registry says licensing is not configured, which is what it is.
 */
export function polarConfigFromEnv(env: Environment): PolarConfig | undefined {
  const accessToken = env.POLAR_ACCESS_TOKEN;
  const organizationId = env.POLAR_ORGANIZATION_ID;
  if (!accessToken || accessToken.length === 0) return undefined;
  if (!organizationId || organizationId.length === 0) return undefined;

  return {
    accessToken,
    apiUrl: env.POLAR_API_URL ?? DEFAULT_API,
    organizationId,
  };
}

/** The slice of Polar's validation response this depends on. */
interface PolarValidation {
  status?: string;
  limit_activations?: number | null;
  expires_at?: string | null;
  customer?: { name?: string | null } | null;
  benefit_id?: string | null;
  license_key?: { status?: string; expires_at?: string | null } | null;
}

export function createPolarProvider(config: PolarConfig): LicenseProvider {
  return {
    name: "polar",

    async check(key: string): Promise<License> {
      const url = `${config.apiUrl.replace(/\/$/, "")}${VALIDATE_PATH}`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ key, organization_id: config.organizationId }),
          // A licence check must not be answered from a cache: a revoked key
          // that keeps working for an hour is a revoked key that works.
          cache: "no-store",
        });
      } catch {
        // Deliberately not "invalid". The upstream being unreachable is our
        // problem, and telling a paying customer their licence is bad because
        // of it sends them to support over an outage they did not cause.
        throw new Error("Could not reach the licence provider.");
      }

      // A key Polar has never issued, or one belonging to another
      // organisation. The only status that is genuinely about the key.
      if (response.status === 404) {
        return invalid("That licence key was not recognised.");
      }

      // 401 and 403 are about *our* credentials — a token that is missing the
      // license_keys scope, or has been rotated — and answering "your key is
      // not recognised" would send a paying customer to support over our
      // misconfiguration. Failing closed is right; blaming them for it is not.
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "The licence provider rejected this registry's credentials. " +
            "Check POLAR_ACCESS_TOKEN and its scopes.",
        );
      }

      if (!response.ok) {
        throw new Error(`Licence provider returned ${String(response.status)}.`);
      }

      let body: PolarValidation;
      try {
        body = (await response.json()) as PolarValidation;
      } catch {
        throw new Error("Licence provider returned something unreadable.");
      }

      const status = body.license_key?.status ?? body.status;
      if (status && status !== "granted") {
        return invalid(
          status === "revoked"
            ? "That licence has been revoked."
            : "That licence is no longer active.",
        );
      }

      const expiresAt = body.license_key?.expires_at ?? body.expires_at ?? undefined;
      if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        return invalid("That licence has expired.");
      }

      return {
        valid: true,
        plan: "Pro",
        holder: body.customer?.name ?? undefined,
        expiresAt: expiresAt ?? undefined,
      };
    },
  };
}
