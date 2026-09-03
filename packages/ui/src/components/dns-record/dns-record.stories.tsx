import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { DnsRecord, type DnsRecordStatus } from "./dns-record";

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-full max-w-2xl">
    <Story />
  </div>
);

const meta = {
  title: "Data/DNS Record",
  component: DnsRecord,
  decorators: [withWidth],
  args: {
    type: "TXT",
    name: "_acme-challenge",
    zone: "acme.com",
    value: "v=verify 7f3a9c2d1e",
    purpose: "Proves you own acme.com",
    onCheck: () => undefined,
  },
} satisfies Meta<typeof DnsRecord>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each part copies on its own, and the name is shown both ways a provider might want it. */
export const Default: Story = {};

/**
 * The check, wired. It alternates between finding something else — which
 * says what — and finding the right value. Neither is a bare "not verified".
 */
export const Checking: Story = {
  parameters: { controls: { disable: true } },
  render: function Checking() {
    const [status, setStatus] = useState<DnsRecordStatus>("pending");
    const [found, setFound] = useState<string[]>([]);
    const [checkedAt, setCheckedAt] = useState<Date | undefined>();
    const [attempt, setAttempt] = useState(0);

    return (
      <DnsRecord
        type="TXT"
        name="_acme-challenge"
        zone="acme.com"
        value="v=verify 7f3a9c2d1e"
        purpose="Proves you own acme.com"
        status={status}
        found={found}
        checkedAt={checkedAt}
        onCheck={() => {
          setStatus("checking");
          setTimeout(() => {
            const next = attempt + 1;
            setAttempt(next);
            setCheckedAt(new Date());
            if (next % 3 === 1) {
              setFound([]);
              setStatus("failed");
            } else if (next % 3 === 2) {
              setFound(["v=verify 7f3a9c2d1f", "google-site-verification=Kx9…"]);
              setStatus("failed");
            } else {
              setFound([]);
              setStatus("verified");
            }
          }, 1200);
        }}
      />
    );
  },
};

/** Mail records carry a priority, and the apex is written as @. */
export const Mail: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-3">
      <DnsRecord
        type="MX"
        name="@"
        zone="acme.com"
        value="mx1.acme-mail.test"
        priority={10}
        ttl={3600}
        purpose="Receives mail for acme.com"
        status="verified"
        checkedAt={new Date("2026-09-04T09:12:00Z")}
      />
      <DnsRecord
        type="TXT"
        name="@"
        zone="acme.com"
        value="v=spf1 include:spf.acme-mail.test -all"
        purpose="Lets acme-mail send as acme.com"
        status="failed"
        found={["v=spf1 -all"]}
        checkedAt={new Date("2026-09-04T09:12:00Z")}
        onCheck={() => undefined}
      />
      <DnsRecord
        type="CNAME"
        name="mail._domainkey"
        zone="acme.com"
        value="mail.dkim.acme-mail.test"
        purpose="Signs outgoing mail"
        onCheck={() => undefined}
      />
    </div>
  ),
};

/** No zone known: the name is shown as given and nothing is said about forms. */
export const WithoutZone: Story = {
  args: { zone: undefined, name: "_acme-challenge.acme.com" },
};
