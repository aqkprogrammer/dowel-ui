import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";

import { ModelViewer } from "./model-viewer";

/**
 * A torus as a self-contained glTF data URL, built here so the story needs no
 * model file. Positions, normals and indices go in one embedded buffer.
 */
function torusGltf(): string {
  const rings = 96;
  const sides = 32;
  const major = 1;
  const minor = 0.38;
  const positions: number[] = [];
  const normals: number[] = [];
  for (let i = 0; i <= rings; i += 1) {
    const u = (i / rings) * Math.PI * 2;
    for (let j = 0; j <= sides; j += 1) {
      const v = (j / sides) * Math.PI * 2;
      const nx = Math.cos(v) * Math.cos(u);
      const ny = Math.sin(v);
      const nz = Math.cos(v) * Math.sin(u);
      positions.push(
        major * Math.cos(u) + minor * nx,
        minor * ny,
        major * Math.sin(u) + minor * nz,
      );
      normals.push(nx, ny, nz);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < rings; i += 1) {
    for (let j = 0; j < sides; j += 1) {
      const a = i * (sides + 1) + j;
      const b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const pos = new Float32Array(positions);
  const nor = new Float32Array(normals);
  const idx = new Uint16Array(indices);
  const bytes = new Uint8Array(pos.byteLength + nor.byteLength + idx.byteLength);
  bytes.set(new Uint8Array(pos.buffer), 0);
  bytes.set(new Uint8Array(nor.buffer), pos.byteLength);
  bytes.set(new Uint8Array(idx.buffer), pos.byteLength + nor.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const extent = major + minor;
  const gltf = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [0.38, 0.4, 0.95, 1],
          metallicFactor: 0.35,
          roughnessFactor: 0.3,
        },
      },
    ],
    buffers: [
      { byteLength: bytes.length, uri: `data:application/octet-stream;base64,${btoa(binary)}` },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength, byteLength: nor.byteLength, target: 34962 },
      {
        buffer: 0,
        byteOffset: pos.byteLength + nor.byteLength,
        byteLength: idx.byteLength,
        target: 34963,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: pos.length / 3,
        type: "VEC3",
        min: [-extent, -minor, -extent],
        max: [extent, minor, extent],
      },
      { bufferView: 1, componentType: 5126, count: nor.length / 3, type: "VEC3" },
      { bufferView: 2, componentType: 5123, count: idx.length, type: "SCALAR" },
    ],
  };
  return `data:model/gltf+json;base64,${btoa(JSON.stringify(gltf))}`;
}

const poster = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><ellipse cx="200" cy="200" rx="150" ry="70" fill="none" stroke="#6366f1" stroke-width="54" opacity="0.85"/></svg>',
)}`;

/** Named so its type is nameable in declaration output (TS2883). */
const withWidth: Decorator = (Story) => (
  <div className="w-[min(28rem,90vw)]">
    <Story />
  </div>
);

const meta = {
  title: "Display/Model Viewer",
  component: ModelViewer,
  args: { src: torusGltf(), poster, alt: "A glossy blue ring, seen from slightly above" },
  argTypes: { src: { control: false }, poster: { control: false } },
  parameters: { layout: "centered" },
  decorators: [withWidth],
} satisfies Meta<typeof ModelViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Loads as it nears the screen. Drag it, or focus it and use the arrow keys; + and − zoom. */
export const Default: Story = {};

/** The poster until someone presses "View in 3D" — three.js and the model load only then. */
export const OnRequest: Story = { args: { reveal: "interaction" } };

/** A model that cannot load: the poster stays, with a note. */
export const Broken: Story = { args: { src: "/missing-model.glb" } };
