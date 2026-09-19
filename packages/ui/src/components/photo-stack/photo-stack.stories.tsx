import type { Meta, StoryObj } from "@storybook/react-vite";

import { DirectionProvider } from "@/components/direction";

import { PhotoStack, type PhotoStackPhoto } from "./photo-stack";

/* SmoothUI's demo deck. The photographs are placeholders. */
const PLACES: PhotoStackPhoto[] = [
  {
    id: "canyon",
    src: "https://picsum.photos/seed/canyon/448/576",
    alt: "Desert canyon at sunset",
    name: "Desert Canyon",
    subtitle: "Golden hour",
  },
  {
    id: "palms",
    src: "https://picsum.photos/seed/palms/448/576",
    alt: "Palm grove in soft light",
    name: "Palm Grove",
    subtitle: "Summer haze",
  },
  {
    id: "lights",
    src: "https://picsum.photos/seed/lights/448/576",
    alt: "City lights bokeh at night",
    name: "City Lights",
    subtitle: "After dark",
  },
];

/* The docs' "Plain photos (no caption)" example. */
const SHOTS: PhotoStackPhoto[] = [
  { id: "a", src: "https://picsum.photos/seed/shot-one/448/576", alt: "Shot one" },
  { id: "b", src: "https://picsum.photos/seed/shot-two/448/576", alt: "Shot two" },
  { id: "c", src: "https://picsum.photos/seed/shot-three/448/576", alt: "Shot three" },
];

/* The docs' usage example: people, with names and roles. */
const PEOPLE: PhotoStackPhoto[] = [
  {
    id: "1",
    src: "https://picsum.photos/seed/mara/448/576",
    alt: "Mara Okonkwo",
    name: "Mara Okonkwo",
    subtitle: "Design engineer",
  },
  {
    id: "2",
    src: "https://picsum.photos/seed/noa/448/576",
    alt: "Noa Bergström",
    name: "Noa Bergström",
    subtitle: "Frontend lead",
  },
  {
    id: "3",
    src: "https://picsum.photos/seed/ines/448/576",
    alt: "Ines Duarte",
    name: "Ines Duarte",
    subtitle: "Solo founder",
  },
];

const meta = {
  title: "Display/Photo Stack",
  component: PhotoStack,
  args: {
    photos: PLACES,
    controls: false,
  },
  argTypes: {
    photos: { control: false },
  },
  render: (args) => (
    <div className="flex min-h-80 items-center justify-center py-6">
      <PhotoStack {...args} />
    </div>
  ),
} satisfies Meta<typeof PhotoStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Gallery: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start justify-center gap-16">
      <figure className="flex flex-col items-center gap-4">
        <PhotoStack photos={PLACES} aria-label="Places" />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Photo Stack
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-4">
        <PhotoStack photos={SHOTS} aria-label="Shots" />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Photo Stack (plain photos)
        </figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-4">
        <PhotoStack photos={PEOPLE} aria-label="Team" controls />
        <figcaption className="text-xs text-muted-foreground">
          SmoothUI · Photo Stack (people, with controls)
        </figcaption>
      </figure>
    </div>
  ),
};

/** Visible previous/next buttons: the pointer-free path, in view. */
export const WithControls: Story = {
  args: { controls: true },
};

export const RightToLeft: Story = {
  args: { controls: true },
  render: (args) => (
    <DirectionProvider dir="rtl">
      <div dir="rtl" className="flex min-h-80 items-center justify-center py-6">
        <PhotoStack {...args} />
      </div>
    </DirectionProvider>
  ),
};
