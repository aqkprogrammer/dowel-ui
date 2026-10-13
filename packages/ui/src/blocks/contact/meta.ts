import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "contact",
  kind: "block",
  title: "Contact",
  description:
    "How to reach the team beside a form that checks itself on submit, sends, and confirms — or keeps everything on failure.",
  category: "form",
  status: "beta",
  dependencies: [],
  registryDependencies: ["button", "card", "form", "input", "label", "radio-group", "textarea"],
  files: ["contact.tsx"],
  a11y:
    "Details are a description list with real mailto:, tel: and <address>. Fields have visible labels; errors " +
    "appear only on submit, in words tied to each field (aria-describedby, aria-invalid), and focus moves to " +
    "the first problem. The topic is a labelled radio group. While sending, the button says so; once sent, a " +
    "confirmation replaces the form and takes focus. A send failure is an alert and keeps what was typed.",
  guidance: {
    useWhen: ["a contact page, or a sales or support enquiry form"],
    avoidWhen: ["a single email signup — use footer-newsletter or cta-banner"],
    alternatives: ["footer-newsletter"],
  },
});
