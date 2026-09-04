import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";

import { DirectionProvider } from "./direction";

const meta = {
  title: "Foundation/Direction Provider",
  component: DirectionProvider,
  parameters: { controls: { disable: true } },
  args: { dir: "ltr" },
} satisfies Meta<typeof DirectionProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function Panel({ dir }: { dir: "ltr" | "rtl" }) {
  return (
    <DirectionProvider dir={dir}>
      <div dir={dir} className="grid w-80 gap-3 rounded-lg border border-border p-4">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{dir}</p>

        <div className="grid gap-2">
          <Label htmlFor={`name-${dir}`}>{dir === "rtl" ? "الاسم" : "Name"}</Label>
          <Input id={`name-${dir}`} placeholder={dir === "rtl" ? "اكتب هنا" : "Type here"} />
        </div>

        <Select defaultValue="one">
          <SelectTrigger aria-label={dir === "rtl" ? "الرقم" : "Number"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one">{dir === "rtl" ? "واحد" : "One"}</SelectItem>
            <SelectItem value="two">{dir === "rtl" ? "اثنان" : "Two"}</SelectItem>
          </SelectContent>
        </Select>

        <Button className="w-full">{dir === "rtl" ? "متابعة" : "Continue"}</Button>
      </div>
    </DirectionProvider>
  );
}

/**
 * Side by side. The styling mirrors from `dir` alone; the select's chevron
 * mirrors because of the provider.
 */
export const BothDirections: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <Panel dir="ltr" />
      <Panel dir="rtl" />
    </div>
  ),
};
