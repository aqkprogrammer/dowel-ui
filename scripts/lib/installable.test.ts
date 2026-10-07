import { describe, expect, it } from "vitest";

import { installable, type RegistryIndex } from "./installable";

const INDEX: RegistryIndex = {
  items: [
    { name: "button", type: "registry:ui" },
    { name: "dialog", type: "registry:ui" },
    { name: "ai-chat", type: "registry:block" },
    { name: "crm", type: "registry:block" },
    { name: "utils", type: "registry:lib" },
    { name: "default", type: "registry:theme" },
  ],
};

/** `crm` is licensed: listed, but the registry build withholds its file. */
const served = (name: string) => name !== "crm";

describe("installable", () => {
  it("takes components and blocks, and leaves what init writes", () => {
    expect(installable(INDEX, served)).toEqual(["button", "dialog", "ai-chat"]);
  });

  it("skips items the registry lists but does not serve", () => {
    expect(installable(INDEX, served)).not.toContain("crm");
  });

  it("narrows to a selection, keeping the registry's order", () => {
    expect(installable(INDEX, served, ["ai-chat", "button"])).toEqual(["button", "ai-chat"]);
  });

  it("refuses a selection it cannot install, rather than passing on nothing", () => {
    expect(() => installable(INDEX, served, ["button", "crm", "nope"])).toThrow(
      "Not in the registry, or withheld: crm, nope",
    );
  });
});
