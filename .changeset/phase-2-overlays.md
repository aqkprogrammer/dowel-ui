---
"@dowel-ui/themes": minor
"@dowel-ui/react": minor
---

Add the interactive overlay layer: Dialog, Sheet, Drawer, Popover, Tooltip,
Dropdown Menu, Tabs, Accordion and Toast.

Drawer and Toast are built in-house on Radix primitives rather than on `vaul`
and `sonner`, so the phase adds no new runtime dependencies. Toast ships an
imperative `toast()` API callable from anywhere, including `toast.promise()`.

The theme package gains an overlay motion layer: two shared keyframe pairs cover
every floating surface and every edge-anchored panel, plus accordion height and
toast swipe animations.
