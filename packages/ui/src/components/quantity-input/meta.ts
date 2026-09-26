import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "quantity-input",
  title: "Quantity Input",
  description:
    'A number with a unit: step it, switch between kg and lb or GB and TB with the amount converted, or type "5 lb".',
  category: "form",
  status: "beta",
  dependencies: ["class-variance-authority"],
  registryDependencies: [],
  files: ["quantity-input.tsx", "quantity.ts", "quantity-units.ts"],
  a11y:
    'The field is a text input with role="spinbutton", aria-valuenow, -valuemin and -valuemax in the current ' +
    'unit, and an aria-valuetext that spells the unit out ("2.5 kilograms", "1 kilogram" where the locale\'s ' +
    "plural rules say one), because an abbreviation read aloud is often just letters. Up and Down step, " +
    "Shift+Arrow and Page Up/Down take ten steps, Home and End jump to the bounds when there are any; Left and " +
    'Right are left to the caret. The − and + buttons are named with the step and unit ("Decrease by 0.1 kg") ' +
    "and stay out of the Tab order, since the arrow keys do the same from the field, so Tab goes field, then " +
    'unit. The unit is a native select named after the field ("Parcel weight unit"), so it has the platform\'s ' +
    "keyboard model and picker. Text that cannot be read is kept on screen with aria-invalid, a message that " +
    "says what to type, and the same message as the field's custom validity; the value stays at the last good " +
    "one. The message is text with an icon, never colour alone, and arrives in a polite live region that is " +
    "present and empty from the start, so it is announced once on blur or Enter rather than while typing. " +
    "Escape discards the text. A development warning fires when the field has no accessible name.",
});
