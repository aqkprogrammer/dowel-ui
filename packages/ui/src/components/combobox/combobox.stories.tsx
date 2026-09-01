import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Label } from "@/components/label";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "./combobox";

const FRAMEWORKS = [
  { value: "Next.js", keywords: ["vercel", "react", "ssr"] },
  { value: "SvelteKit", keywords: ["svelte"] },
  { value: "Nuxt", keywords: ["vue"] },
  { value: "Remix", keywords: ["react"] },
  { value: "Astro", keywords: ["islands", "content"] },
  { value: "SolidStart", keywords: ["solid"] },
];

/** Named so its type is nameable in declaration output (TS2883). */
const withFixedWidth: Decorator = (Story) => (
  <div className="w-64">
    <Story />
  </div>
);

const meta = {
  title: "Forms/Combobox",
  component: Combobox,
  parameters: { controls: { disable: true } },
  decorators: [withFixedWidth],
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="grid gap-2">
      <Label id="framework-label">Framework</Label>
      <Combobox>
        <ComboboxTrigger aria-labelledby="framework-label" placeholder="Select framework…" />
        <ComboboxContent label="Search frameworks">
          <ComboboxInput placeholder="Search framework…" aria-label="Search framework" />
          <ComboboxEmpty>No framework found.</ComboboxEmpty>
          <ComboboxList>
            {FRAMEWORKS.map((framework) => (
              <ComboboxItem
                key={framework.value}
                value={framework.value}
                keywords={framework.keywords}
              />
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

/** Keywords are searchable but never shown — try typing "vercel" or "vue". */
export const HiddenKeywords: Story = {
  render: () => (
    <Combobox>
      <ComboboxTrigger aria-label="Framework" placeholder="Try typing 'vue'…" />
      <ComboboxContent label="Search frameworks">
        <ComboboxInput placeholder="Search framework…" aria-label="Search framework" />
        <ComboboxEmpty>No framework found.</ComboboxEmpty>
        <ComboboxList>
          {FRAMEWORKS.map((framework) => (
            <ComboboxItem
              key={framework.value}
              value={framework.value}
              keywords={framework.keywords}
            />
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
};

export const RichOptions: Story = {
  render: () => (
    <Combobox>
      <ComboboxTrigger aria-label="Assignee" placeholder="Assign to…" />
      <ComboboxContent label="Search people">
        <ComboboxInput placeholder="Search people…" aria-label="Search people" />
        <ComboboxEmpty>No one found.</ComboboxEmpty>
        <ComboboxList>
          {[
            { value: "Ada Lovelace", role: "Engineering" },
            { value: "Grace Hopper", role: "Engineering" },
            { value: "Katherine Johnson", role: "Research" },
          ].map((person) => (
            <ComboboxItem key={person.value} value={person.value} keywords={[person.role]}>
              <span className="flex-1 truncate">{person.value}</span>
              <span className="text-xs text-muted-foreground">{person.role}</span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
};

export const WithDisabledOption: Story = {
  render: () => (
    <Combobox>
      <ComboboxTrigger aria-label="Plan" placeholder="Select a plan…" />
      <ComboboxContent label="Search plans">
        <ComboboxInput placeholder="Search plans…" aria-label="Search plans" />
        <ComboboxEmpty>No plan found.</ComboboxEmpty>
        <ComboboxList>
          <ComboboxItem value="Hobby" />
          <ComboboxItem value="Pro" />
          <ComboboxItem value="Enterprise" disabled>
            Enterprise (contact sales)
          </ComboboxItem>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
};

export const Controlled: Story = {
  render: function Controlled() {
    const [value, setValue] = useState("Astro");
    return (
      <div className="grid gap-3">
        <Combobox value={value} onValueChange={setValue}>
          <ComboboxTrigger aria-label="Framework" />
          <ComboboxContent label="Search frameworks">
            <ComboboxInput placeholder="Search framework…" aria-label="Search framework" />
            <ComboboxEmpty>No framework found.</ComboboxEmpty>
            <ComboboxList>
              {FRAMEWORKS.map((framework) => (
                <ComboboxItem key={framework.value} value={framework.value} />
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <p className="text-xs text-muted-foreground">Selected: {value}</p>
      </div>
    );
  },
};

export const LongList: Story = {
  render: () => (
    <Combobox>
      <ComboboxTrigger aria-label="Timezone" placeholder="Select a timezone…" />
      <ComboboxContent label="Search timezones">
        <ComboboxInput placeholder="Search timezones…" aria-label="Search timezones" />
        <ComboboxEmpty>No timezone found.</ComboboxEmpty>
        <ComboboxList>
          {Array.from({ length: 40 }, (_, index) => {
            const offset = index - 12;
            const label = `UTC${offset >= 0 ? "+" : "-"}${String(Math.abs(offset)).padStart(2, "0")}:00`;
            return <ComboboxItem key={index} value={`${label} · Zone ${String(index + 1)}`} />;
          })}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
};
