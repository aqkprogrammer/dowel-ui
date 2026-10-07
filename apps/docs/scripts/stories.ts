import { readFileSync } from "node:fs";

import ts from "typescript";

/**
 * The names a story file exports, in the order it exports them.
 *
 * `Object.keys` on an imported module cannot answer this. A module namespace
 * object sorts its own keys, so the previews were showing whichever story came
 * first alphabetically — Button's page opened on "As Link" rather than
 * "Default", and every other component page had the same quiet mis-ordering.
 *
 * Order is a deliberate choice by whoever wrote the file: the first story is
 * the canonical one. Recovering it means reading the source, which only the
 * build can do.
 */
export function exportOrder(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX,
  );

  const names: string[] = [];

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!exported) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
    }
  }

  return names;
}

/**
 * The exports of a story file that are stories, in the order it exports them.
 *
 * The previews used to work this out at runtime, by importing every story
 * module and asking `asStory` of each export. That needs the module, and
 * needing every module in order to list any of them is what put the whole
 * library in one chunk on every page. So a page now learns a component's
 * examples from here, and fetches the module only for the one it shows.
 *
 * The rule is `asStory`'s, applied to source rather than to a value: a story is
 * an exported object, and a function, an array or a primitive is not. An
 * export whose value cannot be told from its source — a call, a reference to
 * another binding, a re-export — stops the build rather than being guessed at.
 * Guessing wrong either drops an example from its page without a word or offers
 * one that renders nothing, and the fix for the author is to write the story as
 * the object it already is.
 */
export function storyExports(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX,
  );

  const unreadable = (name: string, why: string) =>
    new Error(
      `${file}: cannot tell whether the export "${name}" is a story without running it (${why}).\n` +
        "The docs list each component's examples from source, so that a page loads only " +
        "the stories it shows. Declare it as an object literal — " +
        "`export const Name: Story = { ... }` — or stop exporting it.",
    );

  const names: string[] = [];

  for (const statement of source.statements) {
    // `export { Primary }` and `export * from` name values declared elsewhere.
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      throw unreadable(statement.getText(source), "a re-export");
    }

    if (!ts.isVariableStatement(statement)) continue;
    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!exported) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      const name = declaration.name.text;

      let value = declaration.initializer;
      while (
        value &&
        (ts.isAsExpression(value) ||
          ts.isSatisfiesExpression(value) ||
          ts.isParenthesizedExpression(value) ||
          ts.isNonNullExpression(value))
      ) {
        value = value.expression;
      }

      if (!value) throw unreadable(name, "it has no initializer");

      if (ts.isObjectLiteralExpression(value)) {
        names.push(name);
        continue;
      }

      const plainlyNotAStory =
        ts.isArrowFunction(value) ||
        ts.isFunctionExpression(value) ||
        ts.isClassExpression(value) ||
        ts.isArrayLiteralExpression(value) ||
        ts.isStringLiteralLike(value) ||
        ts.isTemplateExpression(value) ||
        ts.isNumericLiteral(value) ||
        value.kind === ts.SyntaxKind.TrueKeyword ||
        value.kind === ts.SyntaxKind.FalseKeyword ||
        value.kind === ts.SyntaxKind.NullKeyword;

      if (!plainlyNotAStory)
        throw unreadable(name, `its value is a ${ts.SyntaxKind[value.kind]}`);
    }
  }

  return names;
}
