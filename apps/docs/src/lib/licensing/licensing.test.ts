import { afterEach, describe, expect, it, vi } from "vitest";

import { bearerToken, checkLicense, clearLicenseCache, resolveProvider } from "./index";
import { createPolarProvider, polarConfigFromEnv } from "./polar";
import { invalid, type LicenseProvider } from "./provider";

afterEach(() => {
  clearLicenseCache();
  vi.restoreAllMocks();
});

describe("resolveProvider", () => {
  it("refuses everything when nothing is configured", async () => {
    // The decision that matters most here. Unconfigured must not mean "allow":
    // a missing environment variable would otherwise give the product away.
    const provider = resolveProvider({});

    expect(provider.name).toBe("unconfigured");
    await expect(provider.check("anything")).resolves.toMatchObject({ valid: false });
  });

  it("uses Polar when it is configured", () => {
    expect(
      resolveProvider({ POLAR_ACCESS_TOKEN: "polar_xxx", POLAR_ORGANIZATION_ID: "org_1" }).name,
    ).toBe("polar");
  });

  it("prefers Polar over the development keys", () => {
    expect(
      resolveProvider({
        POLAR_ACCESS_TOKEN: "polar_xxx",
        POLAR_ORGANIZATION_ID: "org_1",
        DOWEL_DEV_LICENSE_KEYS: "dev",
        NODE_ENV: "development",
      }).name,
    ).toBe("polar");
  });

  it("ignores development keys in production, whatever else is set", () => {
    // A test key that works in production is a free licence for anyone who
    // reads this file, and this file is public.
    const provider = resolveProvider({
      DOWEL_DEV_LICENSE_KEYS: "dev-key",
      NODE_ENV: "production",
    });

    expect(provider.name).toBe("unconfigured");
  });

  it("accepts only the development keys it was given, outside production", async () => {
    const provider = resolveProvider({
      DOWEL_DEV_LICENSE_KEYS: "one, two",
      NODE_ENV: "development",
    });

    await expect(provider.check("one")).resolves.toMatchObject({ valid: true });
    await expect(provider.check("two")).resolves.toMatchObject({ valid: true });
    await expect(provider.check("three")).resolves.toMatchObject({ valid: false });
  });
});

describe("bearerToken", () => {
  it("reads the token whatever case the scheme is written in", () => {
    for (const scheme of ["Bearer", "bearer", "BEARER"]) {
      const request = new Request("https://example.test", {
        headers: { authorization: `${scheme} abc123` },
      });
      expect(bearerToken(request)).toBe("abc123");
    }
  });

  it("returns nothing for a missing, empty or unparseable header", () => {
    expect(bearerToken(new Request("https://example.test"))).toBeUndefined();

    for (const header of ["", "Bearer", "Bearer   ", "Basic abc123"]) {
      const request = new Request("https://example.test", {
        headers: { authorization: header },
      });
      expect(bearerToken(request), header).toBeUndefined();
    }
  });
});

describe("checkLicense", () => {
  function counting(answer: { valid: boolean }): LicenseProvider & { calls: number } {
    const provider = {
      name: "counting",
      calls: 0,
      check: () => {
        provider.calls += 1;
        return Promise.resolve(answer);
      },
    };
    return provider;
  }

  it("asks the provider once for a burst of checks on the same key", async () => {
    // Installing a block resolves several items; one upstream call per item
    // turns a single command into a burst.
    const provider = counting({ valid: true });

    await checkLicense("key", provider);
    await checkLicense("key", provider);
    await checkLicense("key", provider);

    expect(provider.calls).toBe(1);
  });

  it("does not answer one key from another key's result", async () => {
    const provider = {
      name: "per-key",
      check: (key: string) => Promise.resolve({ valid: key === "good" }),
    };

    await expect(checkLicense("good", provider)).resolves.toMatchObject({ valid: true });
    await expect(checkLicense("bad", provider)).resolves.toMatchObject({ valid: false });
  });

  it("caches a rejection too, so a wrong key is not unlimited upstream traffic", async () => {
    const provider = counting({ valid: false });

    await checkLicense("wrong", provider);
    await checkLicense("wrong", provider);

    expect(provider.calls).toBe(1);
  });

  it("lets an upstream failure through rather than turning it into a rejection", async () => {
    const provider: LicenseProvider = {
      name: "broken",
      check: () => Promise.reject(new Error("upstream down")),
    };

    // A customer told their licence is invalid because of an outage goes to
    // support over something they did not cause.
    await expect(checkLicense("key", provider)).rejects.toThrow("upstream down");
  });
});

describe("polar", () => {
  it("is not configured without an access token", () => {
    expect(polarConfigFromEnv({})).toBeUndefined();
    expect(
      polarConfigFromEnv({ POLAR_ACCESS_TOKEN: "", POLAR_ORGANIZATION_ID: "o" }),
    ).toBeUndefined();
  });

  it("is not configured without an organisation id either", () => {
    // The endpoint requires it. A token on its own would fail every check at
    // runtime with a malformed-request error, reported to a customer as a
    // problem with their key.
    expect(polarConfigFromEnv({ POLAR_ACCESS_TOKEN: "x" })).toBeUndefined();
    expect(
      polarConfigFromEnv({ POLAR_ACCESS_TOKEN: "x", POLAR_ORGANIZATION_ID: "" }),
    ).toBeUndefined();
  });

  it("takes its endpoint from the environment, with a default", () => {
    const both = { POLAR_ACCESS_TOKEN: "x", POLAR_ORGANIZATION_ID: "org_1" };
    expect(polarConfigFromEnv(both)?.apiUrl).toBe("https://api.polar.sh");
    expect(polarConfigFromEnv({ ...both, POLAR_API_URL: "https://mock.test" })?.apiUrl).toBe(
      "https://mock.test",
    );
  });

  it("validates against the authenticated endpoint, sending the organisation", async () => {
    // Not /v1/customer-portal/license-keys/validate: that one takes no
    // authentication because it is meant for a desktop or mobile client, and
    // is rate-limited to a few requests a second for exactly that reason.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ status: "granted" }));

    const provider = createPolarProvider({
      accessToken: "polar_secret",
      apiUrl: "https://mock.test",
      organizationId: "org_1",
    });
    await provider.check("k");

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("https://mock.test/v1/license-keys/validate");
    expect(JSON.parse(typeof init?.body === "string" ? init.body : "")).toEqual({
      key: "k",
      organization_id: "org_1",
    });
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer polar_secret");
  });

  it("blames itself, not the customer, when its own credentials are rejected", async () => {
    for (const status of [401, 403]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status }));

      const provider = createPolarProvider({
        accessToken: "stale",
        apiUrl: "https://mock.test",
        organizationId: "org_1",
      });

      // Telling a paying customer their key is not recognised because our
      // token lost its scope is a support ticket about the wrong thing.
      await expect(provider.check("k"), String(status)).rejects.toThrow(/credentials/i);
    }
  });

  it("accepts the response shape the endpoint actually returns", async () => {
    // The documented ValidatedLicenseKey is flat: status and expires_at at the
    // top level, no license_key wrapper.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        id: "lk_1",
        status: "granted",
        expires_at: null,
        customer: { name: "Ada Lovelace" },
      }),
    );

    const provider = createPolarProvider({
      accessToken: "x",
      apiUrl: "https://mock.test",
      organizationId: "org_1",
    });

    await expect(provider.check("k")).resolves.toMatchObject({
      valid: true,
      plan: "Pro",
      holder: "Ada Lovelace",
    });
  });

  it("rejects a revoked key with a reason, rather than throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ license_key: { status: "revoked" } }),
    );

    const provider = createPolarProvider({
      accessToken: "x",
      apiUrl: "https://mock.test",
      organizationId: "org_1",
    });

    await expect(provider.check("k")).resolves.toMatchObject({
      valid: false,
      reason: "That licence has been revoked.",
    });
  });

  it("rejects a key that has passed its expiry, even if upstream still says granted", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        license_key: { status: "granted", expires_at: "2020-01-01T00:00:00Z" },
      }),
    );

    const provider = createPolarProvider({
      accessToken: "x",
      apiUrl: "https://mock.test",
      organizationId: "org_1",
    });

    await expect(provider.check("k")).resolves.toMatchObject({
      valid: false,
      reason: "That licence has expired.",
    });
  });

  it("accepts a granted key and reports who it belongs to", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        license_key: { status: "granted" },
        customer: { name: "Ada Lovelace" },
      }),
    );

    const provider = createPolarProvider({
      accessToken: "x",
      apiUrl: "https://mock.test",
      organizationId: "org_1",
    });

    await expect(provider.check("k")).resolves.toMatchObject({
      valid: true,
      holder: "Ada Lovelace",
    });
  });

  it("treats an unknown key as unrecognised rather than as an outage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));

    const provider = createPolarProvider({
      accessToken: "x",
      apiUrl: "https://mock.test",
      organizationId: "org_1",
    });

    await expect(provider.check("k")).resolves.toMatchObject({ valid: false });
  });

  it("throws on an outage rather than answering invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));

    const provider = createPolarProvider({
      accessToken: "x",
      apiUrl: "https://mock.test",
      organizationId: "org_1",
    });

    await expect(provider.check("k")).rejects.toThrow(/licence provider/i);
  });

  it("never asks a cache for a licence answer", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ license_key: { status: "granted" } }));

    const provider = createPolarProvider({
      accessToken: "x",
      apiUrl: "https://mock.test",
      organizationId: "org_1",
    });
    await provider.check("k");

    // A revoked key that keeps working because of an HTTP cache is a revoked
    // key that works.
    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.cache).toBe("no-store");
  });
});

describe("invalid", () => {
  it("always carries a reason", () => {
    expect(invalid("because")).toEqual({ valid: false, reason: "because" });
  });
});
