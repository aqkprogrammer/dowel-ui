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

export interface PolarConfig {
  accessToken: string;
  apiUrl: string;
  /** Restricts which product a key must belong to, when set. */
  organizationId: string | undefined;
}

export function polarConfigFromEnv(env: Environment): PolarConfig | undefined {
  const accessToken = env.POLAR_ACCESS_TOKEN;
  if (!accessToken || accessToken.length === 0) return undefined;

  return {
    accessToken,
    apiUrl: env.POLAR_API_URL ?? DEFAULT_API,
    organizationId: env.POLAR_ORGANIZATION_ID,
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
      const url = `${config.apiUrl.replace(/\/$/, "")}/v1/customer-portal/license-keys/validate`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            key,
            ...(config.organizationId ? { organization_id: config.organizationId } : {}),
          }),
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

      if (response.status === 404 || response.status === 403) {
        return invalid("That licence key was not recognised.");
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
