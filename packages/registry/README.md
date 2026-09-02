<div align="center">

# @dowel-ui/registry

### Builds the component registry the CLI reads

[![npm](https://img.shields.io/npm/v/@dowel-ui/registry?color=5b5bd6)](https://www.npmjs.com/package/@dowel-ui/registry)
[![license](https://img.shields.io/npm/l/@dowel-ui/registry?color=5b5bd6)](https://github.com/aqkprogrammer/dowel-ui/blob/main/LICENSE)

</div>

---

Build tooling for [Dowel](https://dowel-eight.vercel.app). It turns component
source and metadata into the static JSON that
[`@dowel-ui/cli`](https://www.npmjs.com/package/@dowel-ui/cli) installs from.

**Most people do not need this package.** Reach for it if you are hosting your
own registry — a private company one, or a fork with your own components.

```bash
npx @dowel-ui/registry --out ./public/r
```

## What it emits

An `index.json` listing every entry, plus one JSON file per component carrying
its source, its npm dependencies, and the other registry entries it needs.

Every file is content-hashed with `sha256:`, which is what lets the CLI tell an
untouched file from one you have edited.

The build is **deterministic** — no timestamps, no ordering by filesystem
iteration. Running it twice produces byte-identical output, so a publish that
changes nothing shows up as changing nothing. CI verifies that by building
twice and diffing.

---

<div align="center">

[**Read the docs →**](https://dowel-eight.vercel.app)

MIT licensed

</div>
