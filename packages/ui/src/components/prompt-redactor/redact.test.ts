import { describe, expect, it } from "vitest";

import {
  applyRedaction,
  commitPlaceholders,
  findSensitive,
  ibanValid,
  luhn,
  planPlaceholders,
  restoreRedacted,
  type RedactionMap,
} from "./redact";

/**
 * Key-shaped samples are assembled at runtime, so no literal in the source
 * looks like a real credential to a secret scanner. None of them is one.
 */
const FAKE = {
  anthropic: ["sk", "ant", "api03", "abcdefghijklmnopqrstuvwxyz0123"].join("-"),
  stripe: ["sk", "live", "abcdefghijklmnop1234"].join("_"),
  aws: `AK${"IA"}IOSFODNN7EXAMPLE`,
  github: `gh${"p"}_${"a".repeat(36)}`,
  slack: ["xo" + "xb", "1234567890", "abcdef"].join("-"),
  google: `AI${"za"}${"B".repeat(35)}`,
};

function kinds(text: string) {
  return findSensitive(text).map((finding) => [finding.kind, finding.value]);
}

describe("findSensitive", () => {
  it("finds email addresses", () => {
    expect(kinds("Write to dana.lee+billing@acme.co.uk today.")).toEqual([
      ["email", "dana.lee+billing@acme.co.uk"],
    ]);
  });

  it("finds card numbers only when the checksum passes", () => {
    expect(kinds("Card 4242 4242 4242 4242 and 4242-4242-4242-4241.")).toEqual([
      ["card", "4242 4242 4242 4242"],
    ]);
  });

  it("finds IBANs only when the checksum passes", () => {
    expect(kinds("Pay GB82 WEST 1234 5698 7654 32, not GB82 WEST 1234 5698 7654 33.")).toEqual([
      ["iban", "GB82 WEST 1234 5698 7654 32"],
    ]);
  });

  it("finds keys in the formats providers issue", () => {
    const text = Object.values(FAKE).join(" ");
    expect(findSensitive(text).map((finding) => finding.label)).toEqual(
      Array(6).fill("API key"),
    );
  });

  it("finds private keys and access tokens", () => {
    const key = "-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----";
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmnop";
    expect(findSensitive(`${key} then ${jwt}`).map((finding) => finding.label)).toEqual([
      "Private key",
      "Access token",
    ]);
  });

  it("finds phone numbers without mistaking dates, versions or amounts for them", () => {
    expect(kinds("Call +44 20 7946 0958 or (415) 555-2671 or 415.555.2671.")).toEqual([
      ["phone", "+44 20 7946 0958"],
      ["phone", "(415) 555-2671"],
      ["phone", "415.555.2671"],
    ]);
    expect(kinds("On 2026-09-25, v1.2.3, we raised 1 000 000 000 dollars.")).toEqual([]);
  });

  it("finds US Social Security numbers, but not impossible ones", () => {
    expect(kinds("SSN 123-45-6789, not 000-12-3456.")).toEqual([["ssn", "123-45-6789"]]);
  });

  it("lets the first detector win where two would match the same characters", () => {
    // A card number is also a run of digits a phone pattern could reach for.
    expect(kinds("4242 4242 4242 4242").map(([kind]) => kind)).toEqual(["card"]);
  });

  it("masks every value, never showing it whole", () => {
    const [email, card, key] = findSensitive(
      `dana@acme.test 4242 4242 4242 4242 ${FAKE.stripe}`,
    );
    expect(email?.masked).toBe("d•••@acme.test");
    expect(card?.masked).toBe("card ending 4242");
    expect(key?.masked).toBe("sk_…1234");
  });

  it("takes custom detectors, adding the global flag if missing", () => {
    const detectors = [{ kind: "customer", label: "Customer id", pattern: /\bCUS-\d{6}\b/ }];
    expect(
      findSensitive("See CUS-123456 and CUS-654321.", detectors).map(
        (finding) => finding.value,
      ),
    ).toEqual(["CUS-123456", "CUS-654321"]);
  });
});

describe("checksums", () => {
  it("checks Luhn", () => {
    expect(luhn("4242424242424242")).toBe(true);
    expect(luhn("4242424242424241")).toBe(false);
    expect(luhn("4242")).toBe(false);
  });

  it("checks IBANs", () => {
    expect(ibanValid("GB82WEST12345698765432")).toBe(true);
    expect(ibanValid("GB82WEST12345698765433")).toBe(false);
    expect(ibanValid("not an iban")).toBe(false);
  });
});

describe("placeholders", () => {
  const text = "Email dana@acme.test and sam@acme.test, then dana@acme.test again.";

  it("gives each value one placeholder, the same wherever it appears", () => {
    const findings = findSensitive(text);
    const plan = planPlaceholders(findings, new Map());
    expect(applyRedaction(text, findings, plan)).toBe(
      "Email [EMAIL_1] and [EMAIL_2], then [EMAIL_1] again.",
    );
  });

  it("leaves what the person chose to keep", () => {
    const findings = findSensitive(text);
    const plan = planPlaceholders(findings, new Map());
    expect(applyRedaction(text, findings, plan, new Set(["email:sam@acme.test"]))).toBe(
      "Email [EMAIL_1] and sam@acme.test, then [EMAIL_1] again.",
    );
  });

  it("keeps placeholders stable across messages, and numbers new ones after", () => {
    const known: RedactionMap = new Map();
    const first = findSensitive("dana@acme.test");
    commitPlaceholders(known, planPlaceholders(first, known));
    const second = findSensitive("lee@acme.test cc dana@acme.test");
    const plan = planPlaceholders(second, known);
    expect(applyRedaction("lee@acme.test cc dana@acme.test", second, plan)).toBe(
      "[EMAIL_2] cc [EMAIL_1]",
    );
    // Planning does not record anything; only committing does.
    expect(known.size).toBe(1);
  });

  it("restores a reply for display", () => {
    const known: RedactionMap = new Map();
    const findings = findSensitive("Refund 4242 4242 4242 4242 for dana@acme.test.");
    commitPlaceholders(known, planPlaceholders(findings, known));
    expect(
      restoreRedacted(
        "I refunded [CARD_1] and emailed [EMAIL_1]. [EMAIL_9] is unknown.",
        known,
      ),
    ).toBe("I refunded 4242 4242 4242 4242 and emailed dana@acme.test. [EMAIL_9] is unknown.");
  });
});
