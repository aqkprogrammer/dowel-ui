/**
 * A form, read the way an agent needs it — from the form itself.
 *
 * The fields are discovered from the DOM rather than declared again in props:
 * the labels, descriptions, required marks, options and errors are already on
 * the page for people, and a second description of them would drift. Values
 * are set through the same input and change events a person's typing fires,
 * so a controlled React input, React Hook Form or a plain uncontrolled field
 * all see an ordinary edit.
 *
 * Some fields are never an agent's to see or touch: passwords, one-time codes,
 * card numbers, and anything inside `[data-agent-private]`. They are left out of
 * reading and filling entirely, and named only so the agent can tell the
 * person they still need doing.
 */

import type { JsonSchema } from "@/components/agent-surface";

export type FieldKind = "text" | "number" | "checkbox" | "toggle" | "radio" | "select";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormFieldInfo {
  name: string;
  kind: FieldKind;
  label: string;
  description?: string;
  required: boolean;
  options?: FieldOption[];
  /** False for controls this cannot operate safely, which are still read. */
  fillable: boolean;
  /** The controls themselves: every radio of a group, or one element. */
  elements: HTMLElement[];
}

export interface PrivateField {
  name: string;
  label: string;
  required: boolean;
  /** Whether it has anything in it — never what. */
  filled: boolean;
}

export interface DiscoveredForm {
  fields: FormFieldInfo[];
  /** Fields left out because they are the person's alone. */
  privateFields: PrivateField[];
}

const SKIPPED_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "file"]);
const NUMBER_TYPES = new Set(["number", "range"]);
const PRIVATE_AUTOCOMPLETE =
  /\b(current-password|new-password|one-time-code|cc-number|cc-csc|cc-exp|cc-exp-month|cc-exp-year)\b/;

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isControl(element: Element): element is Control {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

export function isPrivate(element: Element): boolean {
  if (element instanceof HTMLInputElement && element.type === "password") return true;
  if (PRIVATE_AUTOCOMPLETE.test(element.getAttribute("autocomplete") ?? "")) return true;
  return element.closest("[data-agent-private]") !== null;
}

function text(element: Element | null | undefined): string {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function byIds(root: Document, ids: string | null): Element[] {
  return (ids ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => root.getElementById(id))
    .filter((element): element is HTMLElement => element !== null);
}

function isMessage(element: Element): boolean {
  return (
    element.getAttribute("data-slot") === "form-message" ||
    element.getAttribute("role") === "alert" ||
    element.getAttribute("role") === "status"
  );
}

function labelOf(element: HTMLElement, fallback: string): string {
  const labelled = byIds(element.ownerDocument, element.getAttribute("aria-labelledby"));
  if (labelled.length > 0) return labelled.map(text).join(" ");
  const aria = element.getAttribute("aria-label");
  if (aria) return aria;
  const labels = (element as HTMLInputElement).labels;
  if (labels && labels.length > 0) return text(labels[0]);
  return element.getAttribute("placeholder") ?? fallback;
}

function descriptionOf(element: HTMLElement): string | undefined {
  const described = byIds(element.ownerDocument, element.getAttribute("aria-describedby"));
  const words = described
    .filter((node) => !isMessage(node))
    .map(text)
    .filter(Boolean);
  return words.length > 0 ? words.join(" ") : undefined;
}

/** The error a person would see for this control, if it is invalid. */
export function errorOf(element: HTMLElement): string | undefined {
  const invalid = element.getAttribute("aria-invalid") === "true";
  const described = byIds(element.ownerDocument, element.getAttribute("aria-describedby"));
  const message = described.filter(isMessage).map(text).filter(Boolean).join(" ");
  if (invalid) return message || "This field is invalid.";
  const form = (element as Control).form;
  if (form && !form.noValidate && isControl(element) && !element.validity.valid) {
    return element.validationMessage || "This field is invalid.";
  }
  return undefined;
}

/**
 * A visually hidden native input standing in for a button control — how Radix
 * checkboxes and switches take part in a form. The button is what a person
 * operates, so it is what gets clicked.
 */
function toggleFor(input: HTMLInputElement): HTMLElement | null {
  const candidates = [
    input.previousElementSibling,
    input.parentElement?.querySelector(":scope > [role=checkbox], :scope > [role=switch]"),
  ];
  for (const candidate of candidates) {
    if (
      candidate instanceof HTMLElement &&
      candidate.matches("[role=checkbox], [role=switch]")
    ) {
      return candidate;
    }
  }
  return null;
}

function groupLabel(radio: HTMLInputElement): string {
  const group = radio.closest("[role=radiogroup]");
  if (group) return labelOf(group as HTMLElement, radio.name);
  const legend = radio.closest("fieldset")?.querySelector("legend");
  return legend ? text(legend) : radio.name;
}

export function discoverFields(form: HTMLFormElement): DiscoveredForm {
  const fields = new Map<string, FormFieldInfo>();
  const privateFields = new Map<string, PrivateField>();

  for (const element of Array.from(form.elements)) {
    if (!isControl(element) || !element.name || element.disabled) continue;
    if (element instanceof HTMLInputElement && SKIPPED_TYPES.has(element.type)) continue;
    if (isPrivate(element)) {
      privateFields.set(element.name, {
        name: element.name,
        label: labelOf(element, element.name),
        required: element.required,
        filled: element.value !== "",
      });
      continue;
    }
    const { name } = element;
    const hidden = element.getAttribute("aria-hidden") === "true";

    if (element instanceof HTMLInputElement && element.type === "radio") {
      const existing = fields.get(name);
      const option = { value: element.value, label: labelOf(element, element.value) };
      if (existing) {
        existing.elements.push(element);
        existing.options?.push(option);
        existing.required ||= element.required;
      } else {
        fields.set(name, {
          name,
          kind: "radio",
          label: groupLabel(element),
          required: element.required,
          options: [option],
          fillable: true,
          elements: [element],
        });
      }
      continue;
    }

    if (hidden) {
      const toggle = element instanceof HTMLInputElement ? toggleFor(element) : null;
      if (toggle) {
        fields.set(name, {
          name,
          kind: "toggle",
          label: labelOf(toggle, name),
          description: descriptionOf(toggle),
          required: element.required,
          fillable: true,
          elements: [toggle],
        });
      } else if (element instanceof HTMLSelectElement) {
        // A custom select's hidden mirror: readable, but setting it would not
        // move the control a person sees.
        fields.set(name, {
          name,
          kind: "select",
          label: name,
          required: element.required,
          fillable: false,
          elements: [element],
        });
      }
      continue;
    }

    const kind: FieldKind =
      element instanceof HTMLSelectElement
        ? "select"
        : element instanceof HTMLInputElement && element.type === "checkbox"
          ? "checkbox"
          : element instanceof HTMLInputElement && NUMBER_TYPES.has(element.type)
            ? "number"
            : "text";

    fields.set(name, {
      name,
      kind,
      label: labelOf(element, name),
      description: descriptionOf(element),
      required: element.required || element.getAttribute("aria-required") === "true",
      options:
        element instanceof HTMLSelectElement
          ? Array.from(element.options, (option) => ({
              value: option.value,
              label: text(option),
            }))
          : undefined,
      fillable: !(element instanceof HTMLSelectElement && element.multiple),
      elements: [element],
    });
  }

  return { fields: [...fields.values()], privateFields: [...privateFields.values()] };
}

const TYPE_HINTS: Record<string, string> = {
  email: "an email address",
  url: "a URL",
  tel: "a phone number",
  date: "a date, YYYY-MM-DD",
  time: "a time, HH:MM",
  "datetime-local": "a date and time, YYYY-MM-DDTHH:MM",
  month: "a month, YYYY-MM",
  color: "a colour, #RRGGBB",
};

function sentence(words: string): string {
  return /[.!?]$/.test(words) ? words : `${words}.`;
}

/** One field as the model is told about it. */
export function fieldSchema(field: FormFieldInfo): JsonSchema {
  const element = field.elements[0];
  const input = element instanceof HTMLInputElement ? element : undefined;
  const hint = input ? TYPE_HINTS[input.type] : undefined;
  const options = field.options
    ?.map((option) =>
      option.label && option.label !== option.value
        ? `${option.value} (${option.label})`
        : option.value,
    )
    .join(", ");
  const description = [
    sentence(field.label),
    field.description ? sentence(field.description) : undefined,
    hint ? `Expects ${hint}.` : undefined,
    options ? `Options: ${options}.` : undefined,
    field.required ? "Required." : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  if (field.kind === "checkbox" || field.kind === "toggle")
    return { type: "boolean", description };
  if (field.kind === "radio" || field.kind === "select") {
    return { type: "string", description, enum: field.options?.map((option) => option.value) };
  }
  if (field.kind === "number") {
    const schema: JsonSchema = { type: "number", description };
    if (input?.min) schema.minimum = Number(input.min);
    if (input?.max) schema.maximum = Number(input.max);
    return schema;
  }
  const schema: JsonSchema = { type: "string", description };
  const control = element as HTMLInputElement | HTMLTextAreaElement | undefined;
  if (control && control.minLength > 0) schema.minLength = control.minLength;
  if (control && control.maxLength > 0) schema.maxLength = control.maxLength;
  return schema;
}

/** The current value, as the agent would send it back. */
export function readValue(field: FormFieldInfo): unknown {
  const [element] = field.elements;
  switch (field.kind) {
    case "checkbox":
      return (element as HTMLInputElement).checked;
    case "toggle":
      return element?.getAttribute("aria-checked") === "true";
    case "radio":
      return (
        (field.elements as HTMLInputElement[]).find((radio) => radio.checked)?.value ?? null
      );
    case "select": {
      const select = element as HTMLSelectElement;
      return select.multiple
        ? Array.from(select.selectedOptions, (option) => option.value)
        : select.value;
    }
    case "number": {
      const value = (element as HTMLInputElement).value;
      return value === "" ? null : Number(value);
    }
    default:
      return (element as HTMLInputElement | HTMLTextAreaElement).value;
  }
}

/**
 * Sets a value the way typing would: through the element's own value setter,
 * then input and change events. React tracks a control's value by that setter,
 * so it sees an ordinary edit rather than a value that changed under it.
 */
function setNative(element: Control, value: string): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Sets one field. Returns why not, if it could not. */
export function writeValue(field: FormFieldInfo, value: unknown): string | undefined {
  const [element] = field.elements;
  if (!element) return `${field.label} is no longer on the page`;
  switch (field.kind) {
    case "checkbox": {
      const checkbox = element as HTMLInputElement;
      if (checkbox.checked !== Boolean(value)) checkbox.click();
      return undefined;
    }
    case "toggle": {
      const on = element.getAttribute("aria-checked") === "true";
      if (on !== Boolean(value)) element.click();
      return undefined;
    }
    case "radio": {
      const radio = (field.elements as HTMLInputElement[]).find(
        (candidate) => candidate.value === asText(value),
      );
      if (!radio) return `${field.label} has no option "${asText(value)}"`;
      if (!radio.checked) radio.click();
      return undefined;
    }
    default: {
      const control = element as Control;
      setNative(control, asText(value));
      if (control instanceof HTMLSelectElement && control.value !== asText(value)) {
        return `${field.label} has no option "${asText(value)}"`;
      }
      return undefined;
    }
  }
}
