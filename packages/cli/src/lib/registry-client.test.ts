import { afterEach, describe, expect, it, vi } from "vitest";

import { branding } from "../branding";
import { CliError } from "./errors";
import { fetchIndex } from "./registry-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a project that names the registry's previous host", () => {
  it("is served from the current host directly, never through the redirect", async () => {
    // A cross-origin redirect drops the Authorization header, so going through
    // the old host would strip the key from every licensed request.
    const fetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 404 })));
    vi.stubGlobal("fetch", fetch);

    await expect(fetchIndex("https://dowel-eight.vercel.app/r")).rejects.toThrow(CliError);
    expect(fetch).toHaveBeenCalledWith(`${branding.registryUrl}/index.json`, expect.anything());
  });

  it("leaves any other registry's address alone", async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 404 })));
    vi.stubGlobal("fetch", fetch);

    await expect(fetchIndex("https://registry.acme.example/r")).rejects.toThrow(CliError);
    expect(fetch).toHaveBeenCalledWith(
      "https://registry.acme.example/r/index.json",
      expect.anything(),
    );
  });
});
