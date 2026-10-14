import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { Globe, type GlobeArc, type GlobeMarker } from "./globe";

const cities: GlobeMarker[] = [
  { label: "London", lat: 51.5, lng: -0.13 },
  { label: "New York", lat: 40.71, lng: -74.0 },
  { label: "São Paulo", lat: -23.55, lng: -46.63 },
  { label: "Lagos", lat: 6.52, lng: 3.38 },
  { label: "Mumbai", lat: 19.08, lng: 72.88 },
  { label: "Singapore", lat: 1.35, lng: 103.82 },
  { label: "Tokyo", lat: 35.68, lng: 139.69 },
  { label: "Sydney", lat: -33.87, lng: 151.21 },
];

const [london, newYork, saoPaulo, lagos, mumbai, singapore, tokyo, sydney] = cities as [
  GlobeMarker,
  GlobeMarker,
  GlobeMarker,
  GlobeMarker,
  GlobeMarker,
  GlobeMarker,
  GlobeMarker,
  GlobeMarker,
];

const routes: GlobeArc[] = [
  { from: london, to: newYork },
  { from: london, to: lagos },
  { from: london, to: mumbai },
  { from: newYork, to: saoPaulo },
  { from: mumbai, to: singapore },
  { from: singapore, to: tokyo },
  { from: singapore, to: sydney },
];

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-[min(32rem,90vw)]">
    <Story />
  </div>
);

const meta = {
  title: "Data/Globe",
  component: Globe,
  args: { label: "Our network", markers: cities, arcs: routes },
  argTypes: { markers: { control: false }, arcs: { control: false }, land: { control: false } },
  parameters: { layout: "centered" },
  decorators: [withWidth],
} satisfies Meta<typeof Globe>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Drag it, or focus it and use the arrow keys. The places and routes are listed for screen readers. */
export const Default: Story = {};

/** Still, centred on Asia, in the info colour. */
export const Still: Story = {
  args: { speed: 0, center: { lat: 15, lng: 100 }, markerColor: "info", arcColor: "info" },
};

/**
 * A `land` test keeps dots only where it returns true. Pass a real land mask
 * (a bitmap from public-domain map data, say) for continents; this one keeps
 * a band around the equator, just to show the hook.
 */
export const LandTest: Story = {
  args: { land: ({ lat }) => Math.abs(lat) < 40, dots: 9000, arcs: [] },
};
