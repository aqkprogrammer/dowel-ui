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
