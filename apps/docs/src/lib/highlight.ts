/**
 * A small syntax highlighter for the code this site shows.
 *
 * The library deliberately ships no highlighter — that choice belongs to the
 * application — and this application needs one that runs on the server and in
 * the browser, costs a few hundred bytes, and handles exactly what is on these
 * pages: TSX, CSS and shell commands. A full grammar engine would be a large
 * dependency to colour three languages. The trade is that this is a tokenizer,
 * not a parser: it never mis-renders the text (every character it is given
 * comes back, in order), it only occasionally picks a plainer colour than a
 * real grammar would.
 */

export type TokenType =
  | "plain"
  | "keyword"
  | "string"
  | "tag"
  | "attr"
  | "fn"
  | "type"
  | "number"
  | "comment"
  | "punct";

export interface Token {
  type: TokenType;
  text: string;
}

const TS_KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "default",
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "of",
  "in",
  "new",
  "type",
  "interface",
  "extends",
  "implements",
  "as",
  "async",
  "await",
  "true",
  "false",
  "null",
  "undefined",
  "this",
  "typeof",
  "keyof",
  "class",
  "switch",
  "case",
  "break",
  "throw",
  "try",
  "catch",
  "satisfies",
  "readonly",
  "void",
]);

/**
 * One alternation, tried left to right at every position. Order matters:
 * comments and strings before anything that could start inside one.
 */
const TS_PATTERN = new RegExp(
  [
    String.raw`(?<comment>\/\/[^\n]*|\/\*[\s\S]*?\*\/)`,
    String.raw`(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\`(?:[^\`\\]|\\.)*\`)`,
    // A JSX tag name, after `<` or `</`.
    String.raw`(?<tagOpen><\/?)(?<tag>[A-Za-z][\w.]*)`,
    String.raw`(?<number>\b\d[\d_]*(?:\.\d+)?\b)`,
    String.raw`(?<word>[A-Za-z_$][\w$]*)`,
    String.raw`(?<punct>[{}()[\];,.<>/=+\-*!?:&|%^~]+)`,
  ].join("|"),
  "g",
);

const CSS_PATTERN = new RegExp(
  [
    String.raw`(?<comment>\/\*[\s\S]*?\*\/)`,
    String.raw`(?<string>"[^"\n]*"|'[^'\n]*')`,
    String.raw`(?<attr>--[\w-]+|[a-z-]+(?=\s*:))`,
    String.raw`(?<fn>[a-z-]+(?=\())`,
    String.raw`(?<number>-?\d*\.?\d+(?:%|[a-z]+)?)`,
    String.raw`(?<tag>[.#:@]?[A-Za-z][\w-]*)`,
    String.raw`(?<punct>[{}();:,>*+~]+)`,
  ].join("|"),
  "g",
);

const SHELL_PATTERN = new RegExp(
  [
    String.raw`(?<comment>#[^\n]*)`,
    String.raw`(?<string>"[^"\n]*"|'[^'\n]*')`,
    String.raw`(?<attr>\s--?[\w-]+)`,
    String.raw`(?<word>[^\s"'#]+)`,
  ].join("|"),
  "g",
);

function push(tokens: Token[], type: TokenType, text: string): void {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last && last.type === type) last.text += text;
  else tokens.push({ type, text });
}

function tokenizeTs(code: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  for (const match of code.matchAll(TS_PATTERN)) {
    const start = match.index;
    push(tokens, "plain", code.slice(index, start));
    const groups = match.groups ?? {};
    if (groups.comment) push(tokens, "comment", groups.comment);
    else if (groups.string) push(tokens, "string", groups.string);
    else if (groups.tag !== undefined && groups.tagOpen !== undefined) {
      push(tokens, "punct", groups.tagOpen);
      push(tokens, "tag", groups.tag);
    } else if (groups.number) push(tokens, "number", groups.number);
    else if (groups.word) {
      const word = groups.word;
      const rest = code.slice(start + word.length);
      const before = code.slice(0, start).trimEnd().at(-1);
      // Text between JSX tags is content, not an identifier.
      if (before === ">" && /^[^<{]*</.test(rest)) push(tokens, "plain", word);
      else if (TS_KEYWORDS.has(word)) push(tokens, "keyword", word);
      else if (/^\s*\(/.test(rest) || /^\s*=\s*(?:async\s*)?\(/.test(rest)) {
        push(tokens, "fn", word);
      } else if (/^=(?!=)/.test(rest) || /^\??:\s/.test(rest)) push(tokens, "attr", word);
      else if (/^[A-Z]/.test(word)) push(tokens, "type", word);
      else push(tokens, "plain", word);
    } else push(tokens, "punct", match[0]);
    index = start + match[0].length;
  }
  push(tokens, "plain", code.slice(index));
  return tokens;
}

function tokenizeWith(code: string, pattern: RegExp, shell: boolean): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let lineStart = true;
  for (const match of code.matchAll(pattern)) {
    const start = match.index;
    const between = code.slice(index, start);
    push(tokens, "plain", between);
    if (between.includes("\n")) lineStart = true;
    const groups = match.groups ?? {};
    const [type] = (Object.entries(groups).find(([, value]) => value !== undefined) ?? [
      "plain",
    ]) as [string, string];
    if (shell && type === "word") {
      // The first word on a line is the command; the rest are its arguments.
      push(tokens, lineStart ? "fn" : "plain", match[0]);
      lineStart = false;
    } else {
      push(tokens, (type === "word" ? "plain" : type) as TokenType, match[0]);
    }
    index = start + match[0].length;
  }
  push(tokens, "plain", code.slice(index));
  return tokens;
}

export type CodeLanguage = "tsx" | "ts" | "jsx" | "js" | "json" | "css" | "bash" | "text";

export function tokenize(code: string, language: string): Token[] {
  switch (language) {
    case "tsx":
    case "ts":
    case "jsx":
    case "js":
    case "json":
      return tokenizeTs(code);
    case "css":
      return tokenizeWith(code, CSS_PATTERN, false);
    case "bash":
    case "sh":
    case "shell":
      return tokenizeWith(code, SHELL_PATTERN, true);
    default:
      return [{ type: "plain", text: code }];
  }
}

/** Tokens split at line breaks, for numbered and highlighted lines. */
export function tokenizeLines(code: string, language: string): Token[][] {
  const lines: Token[][] = [[]];
  for (const token of tokenize(code, language)) {
    const parts = token.text.split("\n");
    parts.forEach((part, index) => {
      if (index > 0) lines.push([]);
      if (part) lines[lines.length - 1]?.push({ type: token.type, text: part });
    });
  }
  return lines;
}
