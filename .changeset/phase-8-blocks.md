---
"@dowel-ui/react": minor
"dowel": minor
"@dowel-ui/registry": minor
---

Add blocks: whole page sections assembled from the components.

Eight to begin with — login, sign-up, forgot-password, dashboard, admin users,
settings, pricing and AI chat. Blocks are registry entries with their own
install location, so `add login` brings the seven components it is built from,
and `add ai-chat` resolves eleven.

`CardTitle` now takes `asChild`, so a card heading can be set to the level a
page actually needs. Building the blocks found three real defects this fixes: a
card title that could not be re-levelled, a checkbox inside a form field that
had no accessible name, and a table action column with an empty header cell.
