import { describe, expect, it } from "vitest";

import { validateInput, type JsonSchema } from "./tool-input";

const SORT: JsonSchema = {
  type: "object",
  properties: {
    column: { type: "string", enum: ["name", "amount", "stage"] },
    direction: { type: "string", enum: ["asc", "desc"] },
  },
  required: ["column"],
  additionalProperties: false,
};

describe("validateInput", () => {
  it("accepts input that matches", () => {
    expect(validateInput(SORT, { column: "amount", direction: "desc" })).toEqual([]);
  });

  it("accepts anything when there is no schema", () => {
    expect(validateInput(undefined, { anything: 1 })).toEqual([]);
  });

  it("treats a missing input as an empty object", () => {
    expect(validateInput({ type: "object", properties: {} }, undefined)).toEqual([]);
    expect(validateInput(SORT, undefined)).toEqual(["column is required"]);
  });

  it("names the allowed values when an enum is missed", () => {
    expect(validateInput(SORT, { column: "value" })).toEqual([
      'column must be one of: "name", "amount", "stage"',
    ]);
  });

  it("lists the known fields when an unknown one is sent", () => {
    expect(validateInput(SORT, { column: "name", order: "asc" })).toEqual([
      "order is not a known field (expected: column, direction)",
    ]);
  });

  it("allows unknown fields unless told not to", () => {
    expect(validateInput({ type: "object", properties: {} }, { extra: true })).toEqual([]);
    expect(
      validateInput({ type: "object", additionalProperties: false }, { extra: true }),
    ).toEqual(["extra is not a known field"]);
  });

  it("checks types, including integer against number", () => {
    expect(validateInput({ type: "integer" }, 1.5)).toEqual(["input must be an integer"]);
    expect(validateInput({ type: "number" }, 2)).toEqual([]);
    expect(validateInput({ type: "object" }, [])).toEqual(["input must be an object"]);
    expect(validateInput({ type: "array" }, {})).toEqual(["input must be an array"]);
    const nullable: JsonSchema = { type: "object", properties: { x: { type: "null" } } };
    expect(validateInput(nullable, { x: null })).toEqual([]);
    expect(validateInput({ type: "boolean" }, "yes")).toEqual(["input must be a boolean"]);
  });

  it("checks number bounds", () => {
    const schema: JsonSchema = { type: "number", minimum: 1, maximum: 10 };
    expect(validateInput(schema, 0)).toEqual(["input must be at least 1"]);
    expect(validateInput(schema, 11)).toEqual(["input must be at most 10"]);
  });

  it("checks string length and pattern", () => {
    const schema: JsonSchema = {
      type: "string",
      minLength: 2,
      maxLength: 4,
      pattern: "^[a-z]+$",
    };
    expect(validateInput(schema, "a")).toEqual(["input must be at least 2 characters"]);
    expect(validateInput(schema, "abcde")).toEqual(["input must be at most 4 characters"]);
    expect(validateInput(schema, "AB")).toEqual(["input must match ^[a-z]+$"]);
  });

  it("checks arrays and their items, with paths", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        ids: { type: "array", minItems: 1, maxItems: 2, items: { type: "string" } },
      },
    };
    expect(validateInput(schema, { ids: [] })).toEqual(["ids must have at least 1 items"]);
    expect(validateInput(schema, { ids: ["a", "b", "c"] })).toEqual([
      "ids must have at most 2 items",
    ]);
    expect(validateInput(schema, { ids: ["a", 2] })).toEqual(["ids[1] must be a string"]);
  });

  it("reports nested required fields with their path", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        contact: {
          type: "object",
          properties: { email: { type: "string" } },
          required: ["email"],
        },
      },
    };
    expect(validateInput(schema, { contact: {} })).toEqual(["contact.email is required"]);
  });

  it("skips properties explicitly set to undefined", () => {
    expect(validateInput(SORT, { column: "name", direction: undefined })).toEqual([]);
  });
});
