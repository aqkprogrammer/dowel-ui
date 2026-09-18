import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProductCard } from "./product-card";

const meta = {
  title: "Display/Product Card",
  component: ProductCard,
  args: {
    title: "Nike Air Max",
    image: "https://picsum.photos/seed/sneaker/600/600",
    price: 129,
    originalPrice: 179,
    rating: 4.5,
    badge: "Sale",
    currency: "USD",
    href: "/example",
  },
  argTypes: {
    rating: { control: { type: "range", min: 0, max: 5, step: 0.5 } },
    badgeVariant: {
      control: "select",
      options: [
        undefined,
        "default",
        "secondary",
        "outline",
        "destructive",
        "success",
        "warning",
        "info",
      ],
    },
  },
  render: (args) => (
    <div className="w-60">
      <ProductCard {...args} />
    </div>
  ),
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/* SmoothUI's demo, product for product; the photographs are placeholders. */
export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <figure className="flex flex-col gap-3">
      <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-4">
        <ProductCard
          title="Nike Air Max"
          image="https://picsum.photos/seed/sneaker/600/600"
          badge="Sale"
          price={129}
          originalPrice={179}
          rating={4.5}
          href="/example"
        />
        <ProductCard
          title="Luxury Perfume"
          image="https://picsum.photos/seed/perfume/600/600"
          badge="New"
          price={89}
          rating={5}
          href="/example"
        />
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">
        SmoothUI · Product Card
      </figcaption>
    </figure>
  ),
};

export const Wishlisted: Story = {
  args: { defaultWishlisted: true, badge: undefined, originalPrice: undefined },
};

export const OtherCurrency: Story = {
  args: {
    title: "Leather weekender",
    image: "https://picsum.photos/seed/bag/600/600",
    price: 240,
    originalPrice: 320,
    currency: "EUR",
    locale: "de-DE",
    badge: "Limited",
    rating: 4,
  },
};

export const WithExtraContent: Story = {
  args: {
    badge: undefined,
    children: <p className="text-xs text-muted-foreground">Free returns within 30 days</p>,
  },
};
