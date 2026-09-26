import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";

import { AgentApprovals } from "@/components/agent-approvals";
import { AgentLedger } from "@/components/agent-ledger";
import { AgentSurface, type AgentSurfaceApi } from "@/components/agent-surface";
import { Button } from "@/components/button";
import { ControlBaton } from "@/components/control-baton";
import {
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
} from "@/components/form";
import { Input } from "@/components/input";
import { Switch } from "@/components/switch";

import { AgentForm } from "./agent-form";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-xl">
    <Story />
  </div>
);

const meta = {
  title: "AI/Agent Form",
  component: AgentForm,
  decorators: [withWidth],
  parameters: { controls: { disable: true } },
  args: { toolName: "invite", toolDescription: "Invite a teammate" },
} satisfies Meta<typeof AgentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An ordinary controlled form. Nothing in it knows about agents. */
function InviteFields({ onSent }: { onSent: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  return (
    <AgentForm
      toolName="invite"
      toolTitle="the invite form"
      toolDescription="Invite a teammate to this workspace"
      onSubmit={(event) => {
        event.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) {
          setError("Enter a valid email address.");
          return;
        }
        setError(undefined);
        onSent(email);
      }}
      className="gap-4"
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
        <FormDescription>Where the invitation is sent.</FormDescription>
        <FormMessage />
      </FormField>
      <FormField name="role">
        <FormLabel>Role</FormLabel>
        <FormControl>
          <select
            name="role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
            }}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </FormControl>
      </FormField>
      <FormField name="message">
        <FormLabel>Message</FormLabel>
        <FormControl>
          <textarea
            name="message"
            rows={2}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
          />
        </FormControl>
      </FormField>
      <div className="flex items-center gap-2">
        <Switch
          name="notify"
          aria-label="Email me when they join"
          checked={notify}
          onCheckedChange={setNotify}
        />
        <span className="text-sm">Email me when they join</span>
      </div>
      <FormField name="password">
        <FormLabel>Your password, to confirm</FormLabel>
        <FormControl>
          <Input
            name="password"
            type="password"
            required
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </FormControl>
        <FormDescription>
          Only you can fill this in. The agent is never shown it.
        </FormDescription>
      </FormField>
      <Button type="submit" className="justify-self-start">
        Send invite
      </Button>
    </AgentForm>
  );
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Let the agent fill it in. It fills the fields through the same events typing
 * fires, reads back what the form now shows, and tries to submit — which stops
 * twice: the password is yours, so it hands over; then submitting sends an
 * invitation, so it asks. The ledger lists the fill, which can be taken back.
 */
export const Default: Story = {
  render: function Render() {
    const apiRef = useRef<AgentSurfaceApi>(null);
    const [log, setLog] = useState<string[]>([]);
    const [sent, setSent] = useState<string>();

    const run = async () => {
      const api = apiRef.current;
      if (!api) return;
      setLog([]);
      api.grant();
      const say = (line: string) => {
        setLog((current) => [...current, line]);
      };
      await wait(700);
      say(
        (
          await api.call("invite_fill", {
            email: "sam@acme.test",
            role: "admin",
            message: "Welcome aboard — the roadmap doc is pinned.",
          })
        ).text,
      );
      await wait(900);
      const submit = await api.call("invite_submit");
      say(submit.text);
      if (!submit.ok && submit.text.includes("for the person")) {
        api.handOver("Enter your password to confirm the invite");
      }
    };

    return (
      <AgentSurface apiRef={apiRef} agentName="Claude" className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <ControlBaton className="flex-1" />
          <Button variant="outline" onClick={() => void run()}>
            Let the agent fill it in
          </Button>
        </div>
        <AgentApprovals />
        <InviteFields onSent={setSent} />
        {sent ? <p className="text-sm">Invitation sent to {sent}.</p> : null}
        {log.length > 0 ? (
          <ol
            aria-label="What the agent was told"
            className="flex flex-col gap-1 rounded-md bg-muted/40 p-2 font-mono text-xs"
          >
            {log.map((line, index) => (
              <li key={`${String(index)}-${line}`}>← {line}</li>
            ))}
          </ol>
        ) : null}
        <AgentLedger />
      </AgentSurface>
    );
  },
};

/**
 * With `declarative` and the surface's `webmcp`, the form describes itself to
 * browser agents with WebMCP's form attributes — `toolname`, `tooldescription`,
 * and `toolparamdescription` on every field — and a submission a browser agent
 * makes still passes through control and approval. Inspect the form to see
 * the attributes.
 */
export const Declarative: Story = {
  render: function Render() {
    const [sent, setSent] = useState<string>();
    return (
      <AgentSurface
        agentName="Browser agent"
        webmcp
        name="team"
        className="flex flex-col gap-4 p-4"
      >
        <AgentApprovals />
        <AgentForm
          toolName="invite"
          toolDescription="Invite a teammate to this workspace"
          declarative
          onSubmit={(event) => {
            event.preventDefault();
            const email = new FormData(event.currentTarget).get("email");
            setSent(typeof email === "string" ? email : "");
          }}
          className="gap-3"
        >
          <label htmlFor="declarative-email" className="text-sm font-medium">
            Email
          </label>
          <Input id="declarative-email" name="email" type="email" required />
          <Button type="submit" className="justify-self-start">
            Send invite
          </Button>
        </AgentForm>
        {sent ? <p className="text-sm">Invitation sent to {sent}.</p> : null}
      </AgentSurface>
    );
  },
};
