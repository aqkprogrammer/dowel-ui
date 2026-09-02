<div align="center">

# @dowel-ui/cli

### The command that puts components in your repo

[![npm](https://img.shields.io/npm/v/@dowel-ui/cli?color=5b5bd6)](https://www.npmjs.com/package/@dowel-ui/cli)
[![license](https://img.shields.io/npm/l/@dowel-ui/cli?color=5b5bd6)](https://github.com/aqkprogrammer/dowel-ui/blob/main/LICENSE)

[**Documentation**](https://dowel-eight.vercel.app/docs/cli) · [**Components**](https://dowel-eight.vercel.app/docs/components)

</div>

---

```bash
npx @dowel-ui/cli init
npx @dowel-ui/cli add button dialog data-table
```

Components are **written into your project as source**, with imports rewritten
to your own path aliases. No dependency stands between you and the markup.

## Commands

| Command  | What it does                                         |
| -------- | ---------------------------------------------------- |
| `init`   | Sets up config, utilities and design tokens          |
| `add`    | Adds components, with everything they depend on      |
| `list`   | Shows the registry, marking what you already have    |
| `update` | Compares your copies against the registry            |
| `remove` | Deletes components, keeping anything you have edited |

## It respects your edits

The CLI records a hash of every file it writes. When you later run `update` or
`remove`, it can tell the difference between a file you never touched and one
you changed — and it will not quietly overwrite your work.

```bash
npx @dowel-ui/cli remove button
# ✕ button.tsx has local changes. Pass --force to delete it anyway.
```

It also refuses to remove a component that another installed component still
imports.

## Point it anywhere

```bash
npx @dowel-ui/cli --registry https://your-registry.example/r add button
```

The registry is static JSON with a content hash per file. Host your own fork,
your own components, or a private company registry — the CLI does not care
whose it is.

---

<div align="center">

[**Read the docs →**](https://dowel-eight.vercel.app/docs/cli)

MIT licensed

</div>
