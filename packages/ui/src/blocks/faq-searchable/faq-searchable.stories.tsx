import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { FaqSearchableBlock } from "./faq-searchable";

/** Named so its type is nameable in declaration output (TS2883). */
const withPageWidth: Decorator = (Story) => (
  <div className="w-[64rem] max-w-full">
    <Story />
  </div>
);

const meta: Meta<typeof FaqSearchableBlock> = {
  title: "Blocks/FAQ searchable",
  component: FaqSearchableBlock,
  parameters: { layout: "fullscreen" },
  decorators: [withPageWidth],
};

export default meta;
type Story = StoryObj<typeof FaqSearchableBlock>;

/** SmoothUI "FAQ 3": type to filter; the match count is announced. */
export const Default: Story = {};

/** Every source item: SmoothUI "FAQ 3" (Faq Searchable), with its default content. */
export const Gallery: Story = {
  render: () => (
    <figure className="flex flex-col gap-2">
      <FaqSearchableBlock />
      <figcaption className="text-center text-sm text-muted-foreground">
        SmoothUI FAQ 3 — Faq Searchable
      </figcaption>
    </figure>
  ),
};

/** Nothing matches: the empty message, also announced. */
export const NoResults: Story = {
  args: { defaultQuery: "quantum" },
};

/** Localised labels. */
export const Localised: Story = {
  args: {
    heading: "Preguntas frecuentes",
    description: "Busca entre las preguntas.",
    labels: {
      search: "Buscar preguntas",
      placeholder: "Buscar…",
      noResults: "Ninguna pregunta coincide.",
      results: (count, total) => `${String(count)} de ${String(total)} preguntas.`,
    },
  },
};
