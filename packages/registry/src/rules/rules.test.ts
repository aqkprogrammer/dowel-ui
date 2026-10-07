import { describe, expect, it } from "vitest";

import { auditSource, findPhysicalProperties, fixPhysicalProperties } from ".";

const none = { installed: new Set<string>() };

function rules(source: string, installed: string[] = []) {
  return auditSource(source, { installed: new Set(installed) }).map(
    (finding) => `${finding.rule}:${finding.found}`,
  );
}

describe("findPhysicalProperties", () => {
  it("reports physical utilities with their exact logical form", () => {
    const found = findPhysicalProperties('<div className="ml-2 pr-4 text-left border-l" />');
    expect(found.map((f) => `${f.found}→${f.suggestion}`)).toEqual([
      "ml-2→ms-2",
      "pr-4→pe-4",
      "text-left→text-start",
      "border-l→border-s",
    ]);
  });

  it("leaves centring, positioned backgrounds and opted-out lines alone", () => {
    expect(findPhysicalProperties('<div className="left-1/2 -translate-x-1/2" />')).toEqual([]);
    expect(findPhysicalProperties('<div className="bg-left origin-top-right" />')).toEqual([]);
    expect(findPhysicalProperties("// arrows are mirrored in right-to-left layouts")).toEqual(
      [],
    );
    expect(
      findPhysicalProperties(
        '// rtl-ok: a resize handle sits on the visual edge\n<div className="right-0" />',
      ),
    ).toEqual([]);
  });
});

describe("findPhysicalProperties, with a colour class in front", () => {
  it("still reports the physical utility", () => {
    // The exemption for `bg-left-top` once matched any `bg-` within a dozen
    // characters, so `bg-muted ml-2` passed the library's own audit.
    expect(
      findPhysicalProperties('<p className="bg-muted ml-2" />').map((f) => f.found),
    ).toEqual(["ml-2"]);
  });
});

describe("fixPhysicalProperties", () => {
  it("rewrites exactly what was reported, negative margins included", () => {
    expect(fixPhysicalProperties('<p className="-ml-2 pl-3 hover:mr-1 pl-30" />')).toBe(
      '<p className="-ms-2 ps-3 hover:me-1 ps-30" />',
    );
  });

  it("is a no-op on code with nothing to fix", () => {
    const source = '<p className="ms-2 left-1/2 -translate-x-1/2" />';
    expect(fixPhysicalProperties(source)).toBe(source);
  });
});

describe("auditSource", () => {
  it("finds colour that skipped the semantic layer", () => {
    expect(rules('<div className="bg-slate-900 text-[#1e293b]" />')).toEqual([
      "palette-colour:bg-slate-900",
      "arbitrary-colour:text-[#1e293b]",
    ]);
    expect(rules('<div style={{ color: "#ff0000" }} />')).toEqual([
      'inline-colour:color: "#ff0000"',
    ]);
  });

  it("does not flag a colour constant, which can be deliberate in app code", () => {
    expect(rules('const BRAND = "#3b82f6";')).toEqual([]);
  });

  it("does not flag semantic tokens", () => {
    expect(rules('<div className="bg-primary text-muted-foreground border-border" />')).toEqual(
      [],
    );
  });

  it("flags off-scale sizes, suggesting the step when one is exact", () => {
    const findings = auditSource(
      '<div className="p-[12px] -mt-[0.5rem] rounded-[7px] w-[640px]" />',
      none,
    );
    expect(findings.map((f) => [f.found, f.suggestion])).toEqual([
      ["p-[12px]", "p-3"],
      ["-mt-[0.5rem]", "-mt-2"],
      ["rounded-[7px]", undefined],
    ]);
  });

  it("reports a native element only when the Dowel component is installed", () => {
    const source = '<button onClick={go}>Go</button>\n<input type="checkbox" />\n<input />';
    expect(rules(source)).toEqual([]);
    expect(rules(source, ["button", "checkbox", "input"])).toEqual([
      "native-element:<button",
      'native-element:<input type="checkbox"',
      "native-element:<input",
    ]);
  });

  it("reports two different elements on one line", () => {
    expect(rules("<button /><select />", ["button", "select"])).toEqual([
      "native-element:<button",
      "native-element:<select",
    ]);
  });

  it("does not treat a hidden input as a field", () => {
    expect(rules('<input type="hidden" name="id" />', ["input"])).toEqual([]);
  });

  it("ignores comments", () => {
    expect(rules("// was bg-slate-900 before the theme\n/* <button> */", ["button"])).toEqual(
      [],
    );
  });

  it("marks only the physical-direction fixes as mechanical", () => {
    const findings = auditSource('<div className="ml-2 bg-red-500" />', none);
    expect(findings.map((f) => [f.rule, f.fixable])).toEqual([
      ["palette-colour", false],
      ["physical-direction", true],
    ]);
  });
});
