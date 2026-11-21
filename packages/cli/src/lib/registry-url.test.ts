import { describe, expect, it } from "vitest";

import { branding } from "../branding";
import { canonicalRegistry, isLegacyRegistry } from "./registry-url";

describe("canonicalRegistry", () => {
  it("moves the previous default host to the current one", () => {
    expect(canonicalRegistry("https://dowel-eight.vercel.app/r")).toBe(branding.registryUrl);
  });

  it("keeps the rest of the URL, trailing slash included", () => {
    expect(canonicalRegistry("https://dowel-eight.vercel.app/r/")).toBe(
      `${branding.registryUrl}/`,
    );
  });

  it("leaves every other registry exactly as given", () => {
    for (const url of [
      branding.registryUrl,
      "https://registry.acme.example/r",
      "http://localhost:3333/r",
      "file:///srv/registry",
      "./packages/registry/r",
    ]) {
      expect(canonicalRegistry(url)).toBe(url);
    }
  });

  it("matches the host exactly, not a lookalike", () => {
    expect(isLegacyRegistry("https://dowel-eight.vercel.app.attacker.example/r")).toBe(false);
    expect(isLegacyRegistry("http://dowel-eight.vercel.app/r")).toBe(false);
    expect(isLegacyRegistry("https://dowel-eight.vercel.app/r")).toBe(true);
  });
});
