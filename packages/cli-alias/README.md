<div align="center">

# dowel-cli

### Not published

</div>

---

This package exists so `npx dowel-cli` could work, because npx resolves a
_package_ name rather than a binary. **npm will not accept the name.**

```
403 Forbidden - PUT https://registry.npmjs.org/dowel-cli
Package name too similar to existing package del-cli
```

That is the second refusal on the same pattern. `dowel` was rejected earlier as
too similar to `del` and `bower`. npm's typosquat check runs only at publish
time, so a 404 from the registry proves a name is unused — never that it can be
claimed.

It is marked `private` so it cannot break a release again, and kept because the
code is two lines and the situation may change. Anyone wanting a shorter name
would need one further from `del`: `getdowel` and `usedowel` are both unused,
though unused is not the same as claimable.

## Use this instead

```bash
npx @dowel-ui/cli add button
```

Or install it, which gives you the plain `dowel` command:

```bash
npm i -g @dowel-ui/cli
dowel add button
```
