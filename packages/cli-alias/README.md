<div align="center">

# dowel-cli

### A one-word name for `npx`

[![npm](https://img.shields.io/npm/v/dowel-cli?color=5b5bd6)](https://www.npmjs.com/package/dowel-cli)

</div>

---

```bash
npx dowel-cli init
npx dowel-cli add button calendar
```

**This package contains no code.** It exists because `npx` resolves a package
name rather than a binary, so a one-word invocation needs a one-word package.
It pins [`@dowel-ui/cli`](https://www.npmjs.com/package/@dowel-ui/cli) and hands
straight over to it.

Every command, flag and behaviour is documented there. If you are already
installing globally, prefer the real thing — it gives you the same `dowel`
command:

```bash
npm i -g @dowel-ui/cli
dowel add button
```
