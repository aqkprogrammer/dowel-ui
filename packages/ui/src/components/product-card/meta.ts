import { defineMeta } from "@/registry/schema";

export const meta = defineMeta({
  name: "product-card",
  title: "Product Card",
  description:
    "A shop tile with image zoom, badge, half-star rating, discount pricing, a wishlist toggle and an add-to-cart confirmation.",
  category: "display",
  status: "beta",
  dependencies: [],
  registryDependencies: ["badge", "morph-button"],
  files: ["product-card.tsx"],
  a11y:
    "The card is an article named by its title; with href the title becomes a link stretched over the card while " +
    'the buttons stay above it. The rating is one image labelled "Rated 4.5 out of 5". Prices read in order ' +
    '("Now $129.00, was $179.00, 28% off") rather than relying on strikethrough and colour. The wishlist heart is a ' +
    "toggle with aria-pressed and a stable name, always visible rather than revealed on hover. Add to cart " +
    'morphs to "Added", announces it through a polite status region and reverts, without ever disabling the ' +
    "button. The entrance animation is skipped under reduced motion.",
});
