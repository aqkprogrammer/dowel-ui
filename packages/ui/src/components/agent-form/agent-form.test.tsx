import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoA11yViolations } from "../../../test/a11y";
import {
  AgentSurface,
  type AgentSurfaceApi,
  type AgentSurfaceProps,
  type AgentToolResult,
} from "../agent-surface";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "../form";
import { Input } from "../input";
import { Switch } from "../switch";
import { AgentForm, type AgentFormProps } from "./agent-form";

interface Sent {
  email: string;
  role: string;
  seats: string;
  newsletter: boolean;
  plan: string;
  notify: boolean;
}

function Invite({
  onSend,
  form,
}: {
  onSend?: (values: Sent) => void;
  form?: Partial<AgentFormProps>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [note, setNote] = useState("");
  const [seats, setSeats] = useState("1");
  const [newsletter, setNewsletter] = useState(false);
  const [plan, setPlan] = useState("free");
  const [notify, setNotify] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  return (
    <AgentForm
      toolName="invite"
      toolDescription="Invite a teammate to the workspace"
      onSubmit={(event) => {
        event.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          setError("Enter a valid email address.");
          return;
        }
        setError(undefined);
        onSend?.({ email, role, seats, newsletter, plan, notify });
      }}
      {...form}
    >
      <FormField name="email" error={error}>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </FormControl>
        <FormDescription>Where the invitation goes.</FormDescription>
        <FormMessage />
      </FormField>
      <label>
        Role
        <select
          name="role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
          }}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <label>
        Note
        <textarea
          name="note"
          maxLength={200}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
          }}
        />
      </label>
      <label>
        Seats
        <input
          type="number"
          name="seats"
          min="1"
          max="10"
          value={seats}
          onChange={(event) => {
            setSeats(event.target.value);
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          name="newsletter"
          checked={newsletter}
          onChange={(event) => {
            setNewsletter(event.target.checked);
          }}
        />
        Send the newsletter
      </label>
      <fieldset>
        <legend>Plan</legend>
        {["free", "pro"].map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="plan"
              value={value}
              checked={plan === value}
              onChange={() => {
                setPlan(value);
              }}
            />
            {value === "free" ? "Free" : "Pro"}
          </label>
        ))}
      </fieldset>
      <Switch
        name="notify"
        aria-label="Notify me"
        checked={notify}
        onCheckedChange={setNotify}
      />
      <label>
        Password
        <input
          type="password"
          name="password"
          required
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
        />
      </label>
      <button type="submit">Send invite</button>
    </AgentForm>
  );
}

function setup(
  surface: Partial<AgentSurfaceProps> = {},
  invite: Parameters<typeof Invite>[0] = {},
) {
  const apiRef = createRef<AgentSurfaceApi>();
  const utils = render(
    <AgentSurface apiRef={apiRef} {...surface}>
      <Invite {...invite} />
    </AgentSurface>,
  );
  const api = () => {
    if (!apiRef.current) throw new Error("no api");
    return apiRef.current;
  };
  const call = async (name: string, input?: Record<string, unknown>) => {
    let result: AgentToolResult = { ok: false, status: "refused", text: "" };
    await act(async () => {
      result = await api().call(name, input);
    });
    return result;
  };
  return { ...utils, api, call };
}

/**
 * A FormDescription registers itself after mount, so the control's
 * aria-describedby — and so the schema read from it — arrives a tick later.
 */
async function settled() {
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  Reflect.deleteProperty(document, "modelContext");
  vi.restoreAllMocks();
});

describe("AgentForm", () => {
  it("offers fill, read and submit, named from toolName", () => {
    const { api } = setup();
    expect(
      api()
        .tools()
        .map((tool) => tool.name)
        .sort(),
    ).toEqual(["invite_fill", "invite_read", "invite_submit"]);
  });

  it("describes each field from the form itself, and leaves private ones out", async () => {
    const { api } = setup();
    await settled();
    const fill = api()
      .tools()
      .find((tool) => tool.name === "invite_fill");
    const properties = fill?.inputSchema?.properties ?? {};
    expect(Object.keys(properties)).toEqual([
      "email",
      "role",
      "note",
      "seats",
      "newsletter",
      "plan",
      "notify",
    ]);
    expect(properties.email).toEqual({
      type: "string",
      description: "Email. Where the invitation goes. Expects an email address. Required.",
    });
    expect(properties.role).toMatchObject({ type: "string", enum: ["member", "admin"] });
    expect(properties.role?.description).toContain("Options: member (Member), admin (Admin).");
    expect(properties.note).toMatchObject({ type: "string", maxLength: 200 });
    expect(properties.seats).toMatchObject({ type: "number", minimum: 1, maximum: 10 });
    expect(properties.newsletter).toMatchObject({ type: "boolean" });
    expect(properties.plan).toMatchObject({ type: "string", enum: ["free", "pro"] });
    expect(properties.plan?.description).toMatch(/^Plan\./);
    expect(properties.notify).toMatchObject({ type: "boolean", description: "Notify me." });
    expect(fill?.inputSchema?.additionalProperties).toBe(false);
  });

  it("fills fields through the events typing fires, so React state follows", async () => {
    const { call } = setup();
    const result = await call("invite_fill", {
      email: "sam@acme.test",
      role: "admin",
      note: "Welcome",
      seats: 3,
      newsletter: true,
      plan: "pro",
      notify: true,
    });
    expect(result.text).toBe("Filled email, role, note, seats, newsletter, plan, notify.");
    expect(screen.getByLabelText("Email")).toHaveValue("sam@acme.test");
    expect(screen.getByLabelText("Role")).toHaveValue("admin");
    expect(screen.getByLabelText("Note")).toHaveValue("Welcome");
    expect(screen.getByLabelText("Seats")).toHaveValue(3);
    expect(screen.getByLabelText("Send the newsletter")).toBeChecked();
    expect(screen.getByLabelText("Pro")).toBeChecked();
    expect(screen.getByRole("switch", { name: "Notify me" })).toBeChecked();
  });

  it("refuses a field that is not in the form, and never touches the password", async () => {
    const { call } = setup();
    const result = await call("invite_fill", { password: "hunter2" });
    expect(result.status).toBe("refused");
    expect(result.text).toContain("password is not a known field");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("takes a fill back, field by field", async () => {
    const onToolCall = vi.fn();
    const { call, api } = setup({ onToolCall });
    await call("invite_fill", { email: "a@b.test", newsletter: true, plan: "pro" });
    const id = (onToolCall.mock.lastCall?.[0] as { id: string }).id;
    await act(async () => {
      await api().undo(id);
    });
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Send the newsletter")).not.toBeChecked();
    expect(screen.getByLabelText("Free")).toBeChecked();
  });

  it("reads values and errors back, naming private fields without reading them", async () => {
    const { call } = setup({ onApprovalRequest: () => true });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
    await call("invite_fill", { email: "nope" });
    await call("invite_submit");
    const result = await call("invite_read");
    const data = result.data as {
      fields: { name: string; value: unknown; error?: string }[];
      private: unknown[];
    };
    expect(data.fields.find((field) => field.name === "email")).toMatchObject({
      value: "nope",
      error: "Enter a valid email address.",
    });
    expect(data.fields.some((field) => field.name === "password")).toBe(false);
    expect(data.private).toEqual([
      { name: "password", label: "Password", required: true, filled: true },
    ]);
    expect(JSON.stringify(data)).not.toContain("secret");
  });

  describe("submit", () => {
    it("waits for approval by default, since a form usually does something", async () => {
      const onSend = vi.fn();
      const { call } = setup({}, { onSend });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
      const result = await call("invite_submit");
      expect(result.text).toBe(
        "This action needs the person's approval, and this page has no way to ask for it.",
      );
      expect(onSend).not.toHaveBeenCalled();
    });

    it("says a private field is the person's to fill, before asking anyone to approve", async () => {
      const onSend = vi.fn();
      const onApprovalRequest = vi.fn(() => true);
      const { call } = setup({ onApprovalRequest }, { onSend });
      await call("invite_fill", { email: "sam@acme.test" });
      const result = await call("invite_submit");
      expect(result).toMatchObject({
        status: "refused",
        text: "“Password” is for the person to fill in. Hand control to them, then submit.",
      });
      expect(onApprovalRequest).not.toHaveBeenCalled();
      expect(onSend).not.toHaveBeenCalled();
    });

    it("submits through the form's own handler once approved", async () => {
      const onSend = vi.fn();
      const { call } = setup({ onApprovalRequest: () => true }, { onSend });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
      await call("invite_fill", { email: "sam@acme.test", role: "admin" });
      const result = await call("invite_submit");
      expect(result).toMatchObject({ ok: true, text: "Submitted Invite." });
      expect(onSend).toHaveBeenCalledWith(
        expect.objectContaining({ email: "sam@acme.test", role: "admin" }),
      );
    });

    it("reports the form's own validation errors, and counts it as not submitted", async () => {
      const onSend = vi.fn();
      const { call } = setup({ onApprovalRequest: () => true }, { onSend });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
      await call("invite_fill", { email: "nope" });
      const result = await call("invite_submit");
      expect(result).toMatchObject({
        ok: false,
        text: "Failed: Not submitted. Email: Enter a valid email address..",
      });
      expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
      expect(onSend).not.toHaveBeenCalled();
    });

    it("needs no approval when submitting can be undone", async () => {
      const onSend = vi.fn();
      const { call } = setup(
        {},
        { onSend, form: { submitReversibility: "revertible", toolTitle: "the invite" } },
      );
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
      await call("invite_fill", { email: "sam@acme.test" });
      expect(await call("invite_submit")).toMatchObject({ text: "Submitted the invite." });
    });

    it("is refused while the person holds control", async () => {
      const { call } = setup({ defaultHolder: "person", onApprovalRequest: () => true });
      expect((await call("invite_submit")).status).toBe("refused");
    });
  });

  describe("declarative WebMCP", () => {
    function installModelContext() {
      const registered = new Set<string>();
      Object.defineProperty(document, "modelContext", {
        configurable: true,
        value: {
          registerTool: (tool: { name: string }, options: { signal: AbortSignal }) => {
            registered.add(tool.name);
            options.signal.addEventListener("abort", () => registered.delete(tool.name));
            return Promise.resolve();
          },
        },
      });
      return registered;
    }

    function agentSubmit(form: HTMLFormElement) {
      const respondWith = vi.fn();
      const event = new Event("submit", { bubbles: true, cancelable: true });
      Object.assign(event, { agentInvoked: true, respondWith });
      form.dispatchEvent(event);
      return { event, respondWith };
    }

    it("describes itself with the form attributes, and does not register fill or submit twice", async () => {
      const registered = installModelContext();
      const { container } = setup(
        { webmcp: true, name: "team" },
        { form: { declarative: true } },
      );
      await settled();
      const form = container.querySelector("form");
      expect(form).toHaveAttribute("toolname", "team_invite");
      expect(form).toHaveAttribute("tooldescription", "Invite a teammate to the workspace");
      // Irreversible by default: the person presses submit, which is the consent.
      expect(form).not.toHaveAttribute("toolautosubmit");
      expect(screen.getByLabelText("Email").getAttribute("toolparamdescription")).toBe(
        "Email. Where the invitation goes. Expects an email address. Required.",
      );
      expect([...registered]).toEqual(["team_invite_read"]);
    });

    it("never overwrites a toolparamdescription you wrote", async () => {
      installModelContext();
      const apiRef = createRef<AgentSurfaceApi>();
      render(
        <AgentSurface apiRef={apiRef} webmcp>
          <AgentForm toolName="search" toolDescription="Search" declarative>
            <label>
              Query <input name="q" {...{ toolparamdescription: "Words to look for" }} />
            </label>
          </AgentForm>
        </AgentSurface>,
      );
      await settled();
      expect(screen.getByLabelText("Query").getAttribute("toolparamdescription")).toBe(
        "Words to look for",
      );
    });

    it("auto-submits only when submitting can be undone", () => {
      installModelContext();
      const { container } = setup(
        { webmcp: true },
        { form: { declarative: true, submitReversibility: "revertible" } },
      );
      expect(container.querySelector("form")).toHaveAttribute("toolautosubmit");
    });

    it("sets no attributes unless the surface offers tools to browsers", () => {
      const { container } = setup({}, { form: { declarative: true } });
      expect(container.querySelector("form")).not.toHaveAttribute("toolname");
    });

    it("routes a browser agent's submit through control and approval", async () => {
      installModelContext();
      const onSend = vi.fn();
      const onToolCall = vi.fn();
      const { container } = setup(
        { webmcp: true, onApprovalRequest: () => true, onToolCall },
        { onSend, form: { declarative: true } },
      );
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sam@acme.test" } });
      const form = container.querySelector("form");
      if (!form) throw new Error("no form");

      let submitted: ReturnType<typeof agentSubmit> | undefined;
      act(() => {
        submitted = agentSubmit(form);
      });
      expect(submitted?.event.defaultPrevented).toBe(true);
      expect(onSend).not.toHaveBeenCalled();

      const response = (await act(
        async () => (await submitted?.respondWith.mock.calls[0]?.[0]) as unknown,
      )) as { content: { text: string }[] };
      expect(response).toEqual({ content: [{ type: "text", text: "Submitted Invite." }] });
      expect(onSend).toHaveBeenCalledOnce();
      expect(onToolCall).toHaveBeenLastCalledWith(
        expect.objectContaining({ tool: "invite_submit", source: "webmcp", status: "done" }),
      );
    });

    it("refuses a browser agent's submit while the person holds control", async () => {
      installModelContext();
      const onSend = vi.fn();
      const { container } = setup(
        { webmcp: true, defaultHolder: "person", onApprovalRequest: () => true },
        { onSend, form: { declarative: true } },
      );
      const form = container.querySelector("form");
      if (!form) throw new Error("no form");
      let submitted: ReturnType<typeof agentSubmit> | undefined;
      act(() => {
        submitted = agentSubmit(form);
      });
      const response = (await act(
        async () => (await submitted?.respondWith.mock.calls[0]?.[0]) as unknown,
      )) as { isError?: boolean; content: { text: string }[] };
      expect(response.isError).toBe(true);
      expect(response.content[0]?.text).toContain("The person has taken control");
      expect(onSend).not.toHaveBeenCalled();
    });

    it("lets a person's own submit through untouched", () => {
      installModelContext();
      const onSend = vi.fn();
      const { container } = setup({ webmcp: true }, { onSend, form: { declarative: true } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sam@acme.test" } });
      const form = container.querySelector("form");
      if (!form) throw new Error("no form");
      fireEvent.submit(form);
      expect(onSend).toHaveBeenCalledOnce();
    });
  });

  it("follows the form as its fields change", async () => {
    function Growing({ extra }: { extra: boolean }) {
      return (
        <AgentForm toolName="profile" toolDescription="Edit a profile">
          <label>
            Name <input name="name" />
          </label>
          {extra ? (
            <label>
              Nickname <input name="nickname" />
            </label>
          ) : null}
        </AgentForm>
      );
    }
    const apiRef = createRef<AgentSurfaceApi>();
    const { rerender } = render(
      <AgentSurface apiRef={apiRef}>
        <Growing extra={false} />
      </AgentSurface>,
    );
    const fields = () =>
      Object.keys(
        apiRef.current?.tools().find((tool) => tool.name === "profile_fill")?.inputSchema
          ?.properties ?? {},
      );
    expect(fields()).toEqual(["name"]);
    rerender(
      <AgentSurface apiRef={apiRef}>
        <Growing extra />
      </AgentSurface>,
    );
    await settled();
    expect(fields()).toEqual(["name", "nickname"]);
  });

  it("forwards its ref and lets className through", () => {
    const ref = createRef<HTMLFormElement>();
    render(
      <AgentSurface>
        <AgentForm ref={ref} toolName="t" toolDescription="d" className="gap-2" />
      </AgentSurface>,
    );
    expect(ref.current).toBeInstanceOf(HTMLFormElement);
    expect(ref.current).toHaveClass("gap-2");
    expect(ref.current).not.toHaveClass("gap-6");
  });

  it("has no detectable accessibility violations after the agent fills it", async () => {
    const { call, container } = setup();
    await call("invite_fill", { email: "sam@acme.test", plan: "pro" });
    await expectNoA11yViolations(container);
  });
});
