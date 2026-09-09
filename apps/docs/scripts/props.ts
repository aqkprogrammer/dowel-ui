import { readFileSync } from "node:fs";

import ts from "typescript";

/**
 * The props each exported component adds, read from its own type declaration.
 *
 * A props table is the one thing every competing component library's page has
 * and these pages do not, and it is the last thing that should be written by
 * hand: the types already exist, they are already checked, and a table typed
 * out beside them is a second copy that goes stale on the first refactor.
 *
 * Read through the TypeScript AST for the same reason `variants.ts` is — these
 * files are long, and a props declaration sits amongst Tailwind strings full of
 * braces and colons. A regex over that is guessing.
 *
 * What is deliberately NOT enumerated: the hundreds of attributes inherited
 * from `ComponentPropsWithRef<"div">`. Nobody reads a table to find out that a
 * div accepts `onMouseEnter`. The element is named once in a footnote instead,
 * and the table carries only what this component itself introduces — which is
 * the part a reader cannot already guess.
 */

export interface PropRow {
  name: string;
  /** Rendered type text, whitespace normalised onto one line. */
  type: string;
  required: boolean;
  /** From the destructured parameter, or from cva's `defaultVariants`. */
  default?: string;
  description?: string;
}

export interface PropsGroup {
  /** The exported component, e.g. "TokenUsage". */
  component: string;
  props: PropRow[];
  /** The intrinsic element whose attributes also pass through, if any. */
  element?: string;
  /**
   * The primitive this forwards every prop to, e.g. "Checkbox.Root".
   *
   * A dozen components here are a styled shell over a Radix part and add no
   * prop of their own. Their table is empty and always will be — the props are
   * Radix's, and documenting them here would be copying another project's API
   * surface into a file that cannot know when it changes. Naming the part and
   * linking out is both shorter and true.
   */
  forwards?: string;
  /** Attributes removed from that element's set with `Omit`. */
  omitted: string[];
}

/** One line, single-spaced — a props table cell cannot hold a wrapped generic. */
function flatten(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function nameOf(node: ts.PropertyName | ts.BindingName): string | undefined {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteral(node)) return node.text;
  return undefined;
}

/** The description above a member, without the comment markers. */
function docOf(node: ts.Node): string | undefined {
  const docs = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  for (const doc of docs) {
    const text = ts.getTextOfJSDocComment(doc.comment);
    if (text) return flatten(text);
  }
  return undefined;
}

/**
 * Every `cva()` assigned to a variable, by variable name.
 *
 * Needed because a component's variant props do not appear in its interface at
 * all — `extends VariantProps<typeof buttonVariants>` is a reference to the
 * `cva` call, and the six values of `variant` exist only there.
 */
function cvaAxes(source: ts.SourceFile): Map<string, PropRow[]> {
  const found = new Map<string, PropRow[]>();

  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === "cva"
    ) {
      const config = node.initializer.arguments[1];
      if (config && ts.isObjectLiteralExpression(config)) {
        found.set(node.name.text, rowsFromCva(config));
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return found;
}

function objectEntries(node: ts.ObjectLiteralExpression) {
  return node.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property)) return [];
    const key = nameOf(property.name);
    return key === undefined ? [] : [{ key, value: property.initializer }];
  });
}

function rowsFromCva(config: ts.ObjectLiteralExpression): PropRow[] {
  const variants = objectEntries(config).find((entry) => entry.key === "variants")?.value;
  if (!variants || !ts.isObjectLiteralExpression(variants)) return [];

  const defaultsNode = objectEntries(config).find(
    (entry) => entry.key === "defaultVariants",
  )?.value;
  const defaults = new Map<string, string>();
  if (defaultsNode && ts.isObjectLiteralExpression(defaultsNode)) {
    for (const entry of objectEntries(defaultsNode)) {
      if (ts.isStringLiteral(entry.value)) defaults.set(entry.key, entry.value.text);
    }
  }

  return objectEntries(variants).flatMap((axis) => {
    if (!ts.isObjectLiteralExpression(axis.value)) return [];
    const options = objectEntries(axis.value).map((option) => option.key);
    if (options.length === 0) return [];

    // cva writes a boolean axis as the string keys "true"/"false"; the prop it
    // produces is a real boolean, so it is reported as one.
    const boolean = options.every((option) => option === "true" || option === "false");
    const fallback = defaults.get(axis.key);

    return [
      {
        name: axis.key,
        type: boolean ? "boolean" : options.map((option) => `"${option}"`).join(" | "),
        required: false,
        ...(fallback === undefined ? {} : { default: `"${fallback}"` }),
      },
    ];
  });
}

/**
 * A generic reference's name and arguments, however it is written.
 *
 * `Foo<T>` in a type position is a `TypeReferenceNode`, but the same text in an
 * `extends` clause is an `ExpressionWithTypeArguments` with an entirely
 * different shape. Both have to resolve identically, or every component that
 * gets its variants through `extends VariantProps<...>` — which is every
 * component that has variants — silently documents none of them.
 */
function referenceOf(
  node: ts.Node,
): { name: string; typeArguments?: ts.NodeArray<ts.TypeNode> } | undefined {
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    return { name: node.typeName.text, typeArguments: node.typeArguments };
  }
  if (ts.isExpressionWithTypeArguments(node) && ts.isIdentifier(node.expression)) {
    return { name: node.expression.text, typeArguments: node.typeArguments };
  }
  return undefined;
}

/** `ComponentPropsWithRef<"div">` and friends: the element, if this is one. */
function intrinsicElement(node: ts.Node): string | undefined {
  const reference = referenceOf(node);
  const PASSTHROUGH = new Set([
    "ComponentPropsWithRef",
    "ComponentPropsWithoutRef",
    "ComponentProps",
    "HTMLAttributes",
  ]);
  if (!reference || !PASSTHROUGH.has(reference.name)) return undefined;

  const argument = reference.typeArguments?.[0];
  return argument && ts.isLiteralTypeNode(argument) && ts.isStringLiteral(argument.literal)
    ? argument.literal.text
    : undefined;
}

/** The keys named by `Omit<T, "a" | "b">`'s second argument. */
function omittedKeys(node: ts.Node): string[] {
  const argument = referenceOf(node)?.typeArguments?.[1];
  if (!argument) return [];

  const literals = ts.isUnionTypeNode(argument) ? argument.types : [argument];
  return literals.flatMap((literal) =>
    ts.isLiteralTypeNode(literal) && ts.isStringLiteral(literal.literal)
      ? [literal.literal.text]
      : [],
  );
}

interface Resolved {
  props: PropRow[];
  element?: string;
  forwards?: string;
  omitted: string[];
}

/**
 * `typeof CheckboxPrimitive.Root` — the primitive a wrapper defers to.
 *
 * Reported under the name the primitive package exports, not the local alias,
 * because "CheckboxPrimitive.Root" is an implementation detail of this file
 * and "Checkbox.Root" is the thing a reader can go and look up.
 */
function forwardedPrimitive(node: ts.Node, aliases: Map<string, string>): string | undefined {
  const argument = referenceOf(node)?.typeArguments?.[0];
  if (!argument || !ts.isTypeQueryNode(argument)) return undefined;

  const qualified = argument.exprName;
  if (!ts.isQualifiedName(qualified) || !ts.isIdentifier(qualified.left)) return undefined;

  const exported = aliases.get(qualified.left.text);
  return exported === undefined ? undefined : `${exported}.${qualified.right.text}`;
}

/**
 * Everything one type expression contributes.
 *
 * Recursive because the interesting declarations are compositions: a props
 * interface extends an `Omit` of an element's attributes and a `VariantProps`
 * of a `cva` call, and each of those answers a different part of the table.
 */
function resolveType(
  node: ts.Node,
  source: ts.SourceFile,
  declarations: Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>,
  variants: Map<string, PropRow[]>,
  aliases: Map<string, string>,
  seen: Set<string>,
): Resolved {
  const element = intrinsicElement(node);
  if (element) return { props: [], element, omitted: [] };

  const forwards = forwardedPrimitive(node, aliases);
  if (forwards) return { props: [], forwards, omitted: [] };

  const reference = referenceOf(node);
  if (reference) {
    const { name, typeArguments } = reference;

    if (name === "Omit" || name === "Pick") {
      const inner = typeArguments?.[0];
      if (!inner) return { props: [], omitted: [] };
      const resolved = resolveType(inner, source, declarations, variants, aliases, seen);
      return name === "Omit"
        ? { ...resolved, omitted: [...resolved.omitted, ...omittedKeys(node)] }
        : resolved;
    }

    if (name === "VariantProps") {
      const argument = typeArguments?.[0];
      // `typeof buttonVariants` — the query's name is the cva variable.
      if (argument && ts.isTypeQueryNode(argument) && ts.isIdentifier(argument.exprName)) {
        return { props: variants.get(argument.exprName.text) ?? [], omitted: [] };
      }
      return { props: [], omitted: [] };
    }

    const declaration = declarations.get(name);
    if (declaration && !seen.has(name)) {
      seen.add(name);
      return resolveDeclaration(declaration, source, declarations, variants, aliases, seen);
    }
  }

  if (ts.isIntersectionTypeNode(node)) {
    return node.types.reduce<Resolved>(
      (accumulated, member) => {
        const resolved = resolveType(member, source, declarations, variants, aliases, seen);
        return {
          props: [...accumulated.props, ...resolved.props],
          element: accumulated.element ?? resolved.element,
          forwards: accumulated.forwards ?? resolved.forwards,
          omitted: [...accumulated.omitted, ...resolved.omitted],
        };
      },
      { props: [], omitted: [] },
    );
  }

  if (ts.isTypeLiteralNode(node)) {
    return { props: membersOf(node.members, source), omitted: [] };
  }

  return { props: [], omitted: [] };
}

function membersOf(
  members: ts.NodeArray<ts.TypeElement> | ts.TypeElement[],
  source: ts.SourceFile,
): PropRow[] {
  return [...members].flatMap((member) => {
    if (!ts.isPropertySignature(member) || !member.name) return [];
    const name = nameOf(member.name);
    if (name === undefined) return [];

    const description = docOf(member);
    return [
      {
        name,
        type: member.type ? flatten(member.type.getText(source)) : "unknown",
        required: member.questionToken === undefined,
        ...(description === undefined ? {} : { description }),
      },
    ];
  });
}

function resolveDeclaration(
  declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
  source: ts.SourceFile,
  declarations: Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>,
  variants: Map<string, PropRow[]>,
  aliases: Map<string, string>,
  seen: Set<string>,
): Resolved {
  if (ts.isTypeAliasDeclaration(declaration)) {
    return resolveType(declaration.type, source, declarations, variants, aliases, seen);
  }

  const inherited = (declaration.heritageClauses ?? []).flatMap((clause) =>
    clause.types.map((type) =>
      resolveType(type, source, declarations, variants, aliases, seen),
    ),
  );

  return {
    props: [
      ...inherited.flatMap((entry) => entry.props),
      ...membersOf(declaration.members, source),
    ],
    element: inherited.find((entry) => entry.element)?.element,
    forwards: inherited.find((entry) => entry.forwards)?.forwards,
    omitted: inherited.flatMap((entry) => entry.omitted),
  };
}

/**
 * Default values, read from the destructuring the component is written with.
 *
 * `{ warnAt = 0.85 }` is where a default actually lives — the interface only
 * says the prop is optional. A renamed binding (`value: valueProp`) still keys
 * on the prop's own name, not the local one.
 */
function defaultsOf(
  parameter: ts.ParameterDeclaration,
  source: ts.SourceFile,
): Map<string, string> {
  const defaults = new Map<string, string>();
  if (!ts.isObjectBindingPattern(parameter.name)) return defaults;

  for (const element of parameter.name.elements) {
    if (!element.initializer) continue;
    const key = element.propertyName
      ? nameOf(element.propertyName)
      : ts.isIdentifier(element.name)
        ? element.name.text
        : undefined;
    if (key !== undefined) defaults.set(key, flatten(element.initializer.getText(source)));
  }

  return defaults;
}

/**
 * Local name to exported name, for the primitive packages.
 *
 * `import { Checkbox as CheckboxPrimitive } from "radix-ui"` is the convention
 * throughout, so the local name is never the one worth reporting.
 */
function primitiveAliases(source: ts.SourceFile): Map<string, string> {
  const aliases = new Map<string, string>();
  const PRIMITIVE_PACKAGES = new Set(["radix-ui", "vaul", "cmdk"]);

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!PRIMITIVE_PACKAGES.has(statement.moduleSpecifier.text)) continue;

    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;

    for (const element of bindings.elements) {
      aliases.set(element.name.text, (element.propertyName ?? element.name).text);
    }
  }

  return aliases;
}

/** Every exported component in one file, in source order, with its own props. */
export function extractProps(file: string): PropsGroup[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    // Parent pointers on: `getText()` needs position information.
    true,
    ts.ScriptKind.TSX,
  );

  const declarations = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();
  for (const statement of source.statements) {
    if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      declarations.set(statement.name.text, statement);
    }
  }

  const variants = cvaAxes(source);
  const aliases = primitiveAliases(source);
  const groups: PropsGroup[] = [];

  for (const statement of source.statements) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name) continue;

    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    // A component, by React's own rule: exported and capitalised.
    if (!exported || !/^[A-Z]/.test(statement.name.text)) continue;

    const parameter = statement.parameters[0];
    if (!parameter?.type) continue;

    const resolved = resolveType(
      parameter.type,
      source,
      declarations,
      variants,
      aliases,
      new Set(),
    );
    const defaults = defaultsOf(parameter, source);
    const omitted = new Set(resolved.omitted);

    // `className` and `children` are on every component here and say nothing.
    const NOISE = new Set(["className", "children", "asChild"]);

    const props = resolved.props
      .filter((prop) => !omitted.has(prop.name))
      .map((prop) => {
        const fallback = defaults.get(prop.name) ?? prop.default;
        return { ...prop, ...(fallback === undefined ? {} : { default: fallback }) };
      })
      // A prop redeclared by a subtype wins; the later declaration is the
      // narrower one, which is what the component actually accepts.
      .reduce<PropRow[]>((rows, prop) => {
        const existing = rows.findIndex((row) => row.name === prop.name);
        if (existing === -1) return [...rows, prop];
        rows[existing] = prop;
        return rows;
      }, [])
      .sort((a, b) => {
        // Required first — they are what the component cannot work without.
        if (a.required !== b.required) return a.required ? -1 : 1;
        // Then the ones that are genuinely this component's, before the
        // conveniences every component here happens to share.
        const noise = Number(NOISE.has(a.name)) - Number(NOISE.has(b.name));
        return noise !== 0 ? noise : a.name.localeCompare(b.name);
      });

    if (props.length === 0 && !resolved.element && !resolved.forwards) continue;

    groups.push({
      component: statement.name.text,
      props,
      ...(resolved.element === undefined ? {} : { element: resolved.element }),
      ...(resolved.forwards === undefined ? {} : { forwards: resolved.forwards }),
      omitted: [...omitted],
    });
  }

  return groups;
}
