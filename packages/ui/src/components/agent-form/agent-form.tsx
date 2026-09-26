"use client";

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";

import {
  useAgentSurface,
  useAgentTool,
  type AgentToolResult,
  type JsonSchema,
  type ToolReversibility,
} from "@/components/agent-surface";
import { Form, type FormProps } from "@/components/form";
import { cn } from "@/lib/utils";

import {
  discoverFields,
  errorOf,
  fieldSchema,
  readValue,
  writeValue,
  type FormFieldInfo,
} from "./form-fields";

// Installed, this file is what `@/components/ui/agent-form` resolves to, so it
// exports everything the folder's index does: see scripts/audit/installed-imports.ts.
export {
  discoverFields,
  fieldSchema,
  isPrivate,
  type DiscoveredForm,
  type FieldKind,
  type FormFieldInfo,
  type PrivateField,
} from "./form-fields";

/**
 * A form an agent can fill in, read back and submit — the way a person does.
 *
 * Three tools, named from `toolName`: `_fill` sets fields through the same
 * input events typing fires, `_read` returns values and the errors a person
 * would see, and `_submit` submits through the form's own submit handler, so
 * its own validation decides. Nothing about the fields is declared twice:
 * labels, descriptions, required marks and options are read from the form.
 *
 * Submitting is treated as irreversible unless you say otherwise, so it waits
 * for approval — a form is usually how something happens in the world.
 * Passwords, one-time codes and card numbers are never read or filled; the
 * agent is told they are the person's to do.
 *
 * With `declarative` (and the surface's `webmcp`), the form also describes
 * itself to browser agents through WebMCP's form attributes, and a submission
 * a browser agent makes is routed through the same control and approval checks
 * as every other call. That part of the draft is the least settled; see
 * `docs/plans/agent-operable-ui.md`.
 */

type AgentSubmitEvent = SubmitEvent & {
  agentInvoked?: boolean;
  respondWith?: (result: Promise<unknown>) => void;
};

const STYLES = `
[data-slot=agent-form]:tool-form-active{outline:2px solid color-mix(in oklab,var(--color-info) 70%,transparent);outline-offset:4px}
`;

/** Lets React commit what the events just changed before anything is read back. */
const settle = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

function humanise(name: string): string {
  const spaced = name.replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function errorsIn(fields: FormFieldInfo[], only?: Set<string>) {
  return fields
    .filter((field) => !only || only.has(field.name))
    .map((field) => {
      const element = field.elements[0];
      return { field, message: element ? errorOf(element) : undefined };
    })
    .filter((entry): entry is { field: FormFieldInfo; message: string } => !!entry.message);
}

function listErrors(errors: { field: FormFieldInfo; message: string }[]): string {
  return errors.map(({ field, message }) => `${field.label}: ${message}`).join("; ");
}

export interface AgentFormProps extends FormProps {
  /** Names the tools: "invite" gives invite_fill, invite_read and invite_submit. */
  toolName: string;
  /** What submitting this form does, for the model: "Invite a teammate". */
  toolDescription: string;
  /** How the form is named to the person. Defaults to `toolName`, humanised. */
  toolTitle?: string;
  /** What submitting does to the world. Unknown consequences are treated as permanent. */
  submitReversibility?: ToolReversibility;
  /** Also describe the form to browser agents with WebMCP's declarative attributes. */
  declarative?: boolean;
}

export function AgentForm({
  toolName,
  toolDescription,
  toolTitle,
  submitReversibility = "irreversible",
  declarative = false,
  className,
  ref,
  onSubmitCapture,
  children,
  ...props
}: AgentFormProps) {
  const { prefix, webmcp, api } = useAgentSurface();
  const formRef = useRef<HTMLFormElement | null>(null);
  const bypass = useRef(false);
  const [shape, setShape] = useState("[]");
  const [described] = useState(() => new WeakSet<Element>());
  const title = toolTitle ?? humanise(toolName);
  const declared = declarative && webmcp;
  const scoped = prefix ? `${prefix}_${toolName}` : toolName;

  // The fields are read from the form, and read again whenever its controls
  // change, so the schema the agent is given is the form on screen.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const update = () => {
      const { fields } = discoverFields(form);
      if (declared) {
        // Kept current for the attributes this wrote; one you wrote is yours.
        for (const field of fields) {
          for (const element of field.elements) {
            if (element.hasAttribute("toolparamdescription") && !described.has(element))
              continue;
            element.setAttribute("toolparamdescription", fieldSchema(field).description ?? "");
            described.add(element);
          }
        }
      }
      setShape(
        JSON.stringify(
          fields
            .filter((field) => field.fillable)
            .map((field) => [field.name, fieldSchema(field)]),
        ),
      );
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(form, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "name",
        "disabled",
        "type",
        "required",
        "aria-required",
        "aria-hidden",
        "aria-label",
        "aria-labelledby",
        "aria-describedby",
        "min",
        "max",
        "minlength",
        "maxlength",
      ],
    });
    return () => {
      observer.disconnect();
    };
  }, [declared, described]);

  const fillSchema = useMemo<JsonSchema>(
    () => ({
      type: "object",
      properties: Object.fromEntries(JSON.parse(shape) as [string, JsonSchema][]),
      additionalProperties: false,
    }),
    [shape],
  );

  const currentForm = () => {
    const form = formRef.current;
    if (!form) throw new Error(`${title} is no longer on the page.`);
    return form;
  };

  useAgentTool<Record<string, unknown>>({
    name: `${toolName}_fill`,
    title: `Fill in ${title}`,
    description:
      `Fill in fields of ${title} (${toolDescription}). Send only the fields to change. ` +
      `Does not submit.`,
    inputSchema: fillSchema,
    target: formRef,
    webmcp: !declared,
    describe: (input) => `Filled ${Object.keys(input).join(", ") || "nothing"} in ${title}`,
    execute: async (input, { onUndo }) => {
      const form = currentForm();
      const fields = new Map(discoverFields(form).fields.map((field) => [field.name, field]));
      const previous: [string, unknown][] = [];
      const problems: string[] = [];
      for (const [name, value] of Object.entries(input)) {
        const field = fields.get(name);
        if (!field?.fillable) {
          problems.push(`${name} cannot be filled`);
          continue;
        }
        previous.push([name, readValue(field)]);
        const problem = writeValue(field, value);
        if (problem) problems.push(problem);
      }
      if (previous.length === 0) throw new Error(problems.join("; "));

      onUndo(() => {
        const now = new Map(discoverFields(currentForm()).fields.map((f) => [f.name, f]));
        for (const [name, value] of previous.reverse()) {
          const field = now.get(name);
          if (field) writeValue(field, value);
        }
      });

      await settle();
      const errors = errorsIn(
        discoverFields(form).fields,
        new Set(previous.map(([name]) => name)),
      );
      return [
        `Filled ${previous.map(([name]) => name).join(", ")}.`,
        problems.length > 0 ? `Not filled: ${problems.join("; ")}.` : "",
        errors.length > 0 ? `Errors shown: ${listErrors(errors)}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
    },
  });

  useAgentTool({
    name: `${toolName}_read`,
    title: `Read ${title}`,
    description:
      `The fields of ${title}, their current values, and any errors a person would see. ` +
      `Private fields (passwords, codes, card numbers) are named but never read.`,
    effect: "read",
    untrustedOutput: true,
    describe: () => `Read ${title}`,
    execute: () => {
      const { fields, privateFields } = discoverFields(currentForm());
      return {
        fields: fields.map((field) => ({
          name: field.name,
          label: field.label,
          value: readValue(field),
          required: field.required,
          error: field.elements[0] ? errorOf(field.elements[0]) : undefined,
          fillable: field.fillable,
        })),
        private: privateFields.map(({ name, label, required, filled }) => ({
          name,
          label,
          required,
          filled,
        })),
      };
    },
  });

  useAgentTool({
    name: `${toolName}_submit`,
    title: `Submit ${title}`,
    description:
      `Submit ${title}: ${toolDescription}. The form's own validation runs; if anything is ` +
      `invalid, nothing is submitted and the errors are returned.`,
    reversibility: submitReversibility,
    target: formRef,
    webmcp: !declared,
    describe: () => `Submitted ${title}`,
    // Before approval, so the person is not asked to approve a submit that
    // cannot happen until they have filled in their own fields.
    precondition: () => {
      const missing = discoverFields(currentForm()).privateFields.filter(
        (field) => field.required && !field.filled,
      );
      if (missing.length === 0) return undefined;
      return (
        `${missing.map((field) => `“${field.label}”`).join(", ")} ${missing.length === 1 ? "is" : "are"} ` +
        `for the person to fill in. Hand control to them, then submit.`
      );
    },
    execute: async () => {
      const form = currentForm();
      bypass.current = true;
      try {
        form.requestSubmit();
      } finally {
        bypass.current = false;
      }
      await settle();
      const errors = errorsIn(discoverFields(form).fields);
      if (errors.length > 0) throw new Error(`Not submitted. ${listErrors(errors)}.`);
      return `Submitted ${title}.`;
    },
  });

  // A browser agent submitting the declarative form: stop it here and route
  // it through the submit tool, so control and approval apply to it too. The
  // real submission follows in a new task, because a form ignores a submit
  // requested while its own submit event is still firing.
  const onAgentSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    const native = event.nativeEvent as AgentSubmitEvent;
    if (!declared || !native.agentInvoked || bypass.current) return;
    event.preventDefault();
    event.stopPropagation();
    const result = settle()
      .then(() => api.call(`${scoped}_submit`, {}, { source: "webmcp" }))
      .then((outcome: AgentToolResult) => ({
        content: [{ type: "text", text: outcome.text }],
        ...(outcome.ok ? {} : { isError: true }),
      }));
    native.respondWith?.(result);
  };

  const declaration = declared
    ? {
        toolname: scoped,
        tooldescription: toolDescription,
        ...(submitReversibility === "irreversible" ? {} : { toolautosubmit: "" }),
      }
    : {};

  return (
    <>
      <style href="dowel-agent-form" precedence="dowel">
        {STYLES}
      </style>
      <Form
        ref={(node) => {
          formRef.current = node;
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
        }}
        data-slot="agent-form"
        onSubmitCapture={(event) => {
          onSubmitCapture?.(event);
          onAgentSubmit(event);
        }}
        className={cn(className)}
        {...declaration}
        {...props}
      >
        {children}
      </Form>
    </>
  );
}
