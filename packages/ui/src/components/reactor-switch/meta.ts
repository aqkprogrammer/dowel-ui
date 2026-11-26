import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "reactor-switch",
  title: "Reactor Switch",
  description:
    "A switch drawn as an armoured power core that slides across, lights its cells one by one and crackles with current.",
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority", "radix-ui"],
  registryDependencies: [],
  files: ["reactor-switch.tsx"],
  a11y:
    'Built on the Radix switch primitive: role="switch" with aria-checked, toggled by click, Space or Enter, ' +
    "with a focus ring and a hidden input inside forms. The artwork and the optional `readout` line are " +
    "aria-hidden; name the switch with aria-label or a <label>. The core's position carries the state, not " +
    "colour. Under reduced motion the core jumps, the readout jumps to its value, and the current and sparks " +
    "stop. The scene never mirrors in right-to-left layouts.",
  guidance: {
    useWhen: [
      "a showpiece on/off control — a power, boost or turbo mode — where the switch is the moment",
    ],
    avoidWhen: [
      "a settings list with many switches — use switch",
      "dense forms, where a 224px switch dominates the row",
    ],
    alternatives: ["switch", "boulder-run-switch", "liquid-toggle"],
  },
});
