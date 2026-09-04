import { readFileSync } from "node:fs";

import ts from "typescript";

/**
 * The variant axes a component actually exposes, read from its `cva()` call.
 *
 * The playground needs to know that Button has a `variant` with six values and
 * a `size` with five. Only 22 of the 70 components spell that out in their
 * Storybook `argTypes`; every component that has variants at all declares them
 * in `cva`, and that declaration is the one the component's classes are
 * generated from — so it cannot describe options the component does not have.
 *
 * Read through the TypeScript AST rather than with a regular expression. Every
 * component here is a long string of Tailwind classes containing braces,
 * colons, and words like `variants`; a regex over that is guessing, and a
 * playground offering a variant that does not exist is worse than one offering
 * none.
 */

export interface VariantAxis {
  /** Prop name, e.g. "variant" or "size". */
  prop: string;
  options: string[];
  /** The value applied when the prop is omitted, if `defaultVariants` says. */
  fallback?: string;
}

/** Keys of an object literal, in source order, as written. */
function keysOf(node: ts.ObjectLiteralExpression): { key: string; value: ts.Expression }[] {
  const found: { key: string; value: ts.Expression }[] = [];

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;

    const name = property.name;
    const key = ts.isIdentifier(name)
      ? name.text
      : ts.isStringLiteral(name)
        ? name.text
        : undefined;

    if (key !== undefined) found.push({ key, value: property.initializer });
  }

  return found;
}

function propertyNamed(
  node: ts.ObjectLiteralExpression,
  key: string,
): ts.Expression | undefined {
  return keysOf(node).find((entry) => entry.key === key)?.value;
}

function stringValue(node: ts.Expression): string | undefined {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined;
}

/**
 * Axes from one `cva(base, config)` call.
 *
 * A boolean axis — `variants: { inset: { true: "..." } }` — is skipped rather
 * than offered as a two-value select: cva writes those keys as strings, so the
 * control would set `inset="true"` where the component expects `inset={true}`.
 */
function axesFromConfig(config: ts.ObjectLiteralExpression): VariantAxis[] {
  const variants = propertyNamed(config, "variants");
  if (!variants || !ts.isObjectLiteralExpression(variants)) return [];

  const defaults = propertyNamed(config, "defaultVariants");
  const fallbacks = new Map<string, string>();

  if (defaults && ts.isObjectLiteralExpression(defaults)) {
    for (const entry of keysOf(defaults)) {
      const value = stringValue(entry.value);
      if (value !== undefined) fallbacks.set(entry.key, value);
    }
  }

  const axes: VariantAxis[] = [];

  for (const entry of keysOf(variants)) {
    if (!ts.isObjectLiteralExpression(entry.value)) continue;

    const options = keysOf(entry.value).map((option) => option.key);
    const boolean = options.every((option) => option === "true" || option === "false");
    if (options.length < 2 || boolean) continue;

    axes.push({
      prop: entry.key,
      options,
      fallback: fallbacks.get(entry.key),
    });
  }

  return axes;
}

/**
 * Axes for the component a file's first `cva()` call describes.
 *
 * A file with several `cva()` calls is describing several parts — Alert has
 * one for the box and one for the icon — and only the first belongs to the
 * component the page is about. Taking all of them would put an axis on the
 * playground that its preview does not render.
 */
export function extractVariants(file: string): VariantAxis[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    // No parent pointers needed; nothing here walks upward.
    false,
    ts.ScriptKind.TSX,
  );

  let axes: VariantAxis[] | undefined;

  const visit = (node: ts.Node): void => {
    if (axes) return;

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "cva"
    ) {
      const config = node.arguments[1];
      if (config && ts.isObjectLiteralExpression(config)) {
        const found = axesFromConfig(config);
        if (found.length > 0) {
          axes = found;
          return;
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return axes ?? [];
}
