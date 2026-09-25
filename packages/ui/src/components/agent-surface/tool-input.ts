/**
 * Checks what an agent sent against what a tool said it takes.
 *
 * The browser does not validate a WebMCP call against its `inputSchema`, and a
 * model will happily send `"amount"` to a tool whose column is `"value"`. So
 * the page does it, before anything runs — and says what was wrong in words a
 * model can correct from, which is the difference between an agent that
 * retries properly and one that retries the same mistake.
 *
 * Deliberately a small subset of JSON Schema: the keywords a tool's input
 * actually uses. Anything it does not know is ignored rather than rejected.
 */

export type JsonSchemaType =
  "object" | "string" | "number" | "integer" | "boolean" | "array" | "null";

export interface JsonSchema {
  type?: JsonSchemaType;
  description?: string;
  enum?: readonly unknown[];
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  default?: unknown;
}

function typeOf(value: unknown): JsonSchemaType | "undefined" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "object") {
    return typeof value as JsonSchemaType;
  }
  return "undefined";
}

function matchesType(value: unknown, type: JsonSchemaType): boolean {
  const actual = typeOf(value);
  return actual === type || (type === "number" && actual === "integer");
}

function list(values: readonly unknown[]): string {
  return values.map((value) => JSON.stringify(value)).join(", ");
}

function check(schema: JsonSchema, value: unknown, path: string, problems: string[]): void {
  const at = path || "input";

  if (schema.type && !matchesType(value, schema.type)) {
    problems.push(`${at} must be ${/^[aeiou]/.test(schema.type) ? "an" : "a"} ${schema.type}`);
    return;
  }

  if (schema.enum && !schema.enum.some((option) => option === value)) {
    problems.push(`${at} must be one of: ${list(schema.enum)}`);
    return;
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      problems.push(`${at} must be at least ${String(schema.minimum)}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      problems.push(`${at} must be at most ${String(schema.maximum)}`);
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      problems.push(`${at} must be at least ${String(schema.minLength)} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      problems.push(`${at} must be at most ${String(schema.maxLength)} characters`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) {
      problems.push(`${at} must match ${schema.pattern}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      problems.push(`${at} must have at least ${String(schema.minItems)} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      problems.push(`${at} must have at most ${String(schema.maxItems)} items`);
    }
    if (schema.items) {
      const items = schema.items;
      value.forEach((item, index) => {
        check(items, item, `${at}[${String(index)}]`, problems);
      });
    }
  }

  if (typeOf(value) === "object") {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (record[key] === undefined)
        problems.push(`${path ? `${path}.` : ""}${key} is required`);
    }
    for (const [key, entry] of Object.entries(record)) {
      const property = schema.properties?.[key];
      const child = path ? `${path}.${key}` : key;
      if (property) {
        if (entry !== undefined) check(property, entry, child, problems);
      } else if (schema.additionalProperties === false) {
        const known = Object.keys(schema.properties ?? {});
        problems.push(
          known.length > 0
            ? `${child} is not a known field (expected: ${known.join(", ")})`
            : `${child} is not a known field`,
        );
      }
    }
  }
}

/**
 * Every problem with `input`, in plain words. Empty means it is acceptable.
 *
 * A missing input is treated as an empty object, since a tool with no required
 * fields may reasonably be called with nothing at all.
 */
export function validateInput(schema: JsonSchema | undefined, input: unknown): string[] {
  if (!schema) return [];
  const problems: string[] = [];
  check(schema, input ?? {}, "", problems);
  return problems;
}
