<div align="center">

# @dowel-ui/mcp

### The registry, answered live to your coding agent

[![npm](https://img.shields.io/npm/v/@dowel-ui/mcp?color=5b5bd6)](https://www.npmjs.com/package/@dowel-ui/mcp)
[![license](https://img.shields.io/npm/l/@dowel-ui/mcp?color=5b5bd6)](https://github.com/aqkprogrammer/dowel-ui/blob/main/LICENSE)

[**Documentation**](https://dowel-eight.vercel.app/docs/ai-agents) · [**Components**](https://dowel-eight.vercel.app/docs/components)

</div>

---

A [Model Context Protocol](https://modelcontextprotocol.io) server over the Dowel
component registry. It lets a coding agent search what exists, read a
component's description, accessibility notes and source, get the exact install
command, and plan a screen from a description — instead of guessing, or writing
a second Button.

It speaks MCP over stdio, so the client starts it as a subprocess. It reads the
registry and never writes to your project; installing is still the CLI's job.

## Set it up

### Claude Code

```bash
claude mcp add dowel -- npx -y @dowel-ui/mcp
```

With the import path your components live under:

```bash
claude mcp add dowel -e DOWEL_IMPORT_FROM=@/components/ui -- npx -y @dowel-ui/mcp
```

### Claude Desktop, Cursor and other JSON-configured clients

Claude Desktop reads `claude_desktop_config.json`; Cursor reads
`.cursor/mcp.json` in the project, or `~/.cursor/mcp.json`. Both take the same
shape:

```json
{
  "mcpServers": {
    "dowel": {
      "command": "npx",
      "args": ["-y", "@dowel-ui/mcp"],
      "env": {
        "DOWEL_IMPORT_FROM": "@/components/ui"
      }
    }
  }
}
```

Node 20 or later.

## Options

Each option is a flag or an environment variable. The flag wins when both are
set.

| Flag            | Environment         | Default                            | What it does                                                                                                                                                                                                                     |
| --------------- | ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--registry`    | `DOWEL_REGISTRY`    | `https://dowel-eight.vercel.app/r` | Where the registry is. An `http(s)://` URL, a `file:` URL, or a directory on disk — a fork, an internal mirror, or a local build.                                                                                                |
| `--import-from` | `DOWEL_IMPORT_FROM` | `@dowel-ui/react`                  | What the project imports components from, used in `get_component`'s import line and in what `plan_ui` returns. The server cannot see your project's path aliases, so set this to the alias your components were installed under. |

As flags, they go after the package name in `args`:

```json
"args": ["-y", "@dowel-ui/mcp", "--registry", "https://registry.example.com/r"]
```

The registry index, and every item read from it, is cached for the life of the
process. Restart the server to see a new release of the registry.

### A private registry

If the registry answers `401`, the server retries once with `DOWEL_TOKEN`, but
only when `DOWEL_TOKEN_REGISTRY` names that same registry, and only over HTTPS
or to `localhost`. Set both in the server's `env` block. A public registry never
receives the key.

## Tools

Every tool returns text. A call that names something the registry does not
have comes back flagged as an error (`isError: true`) with suggestions in the
text; arguments that do not match a tool's input schema are rejected the same
way, before the tool runs.

### `search_components`

Searches the components and blocks by name, title, guidance, category and
description. Exact names rank first, then names that start with the query, then
names that contain it, then titles, then the situations an item's guidance says
it is for, then categories and descriptions.

| Input      | Type                                  | Notes                                                                                                                                   |
| ---------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `query`    | string, optional                      | Omit to list everything.                                                                                                                |
| `category` | string, optional                      | One category, matched exactly: `ai`, `form`, `overlay`, `data`, `feedback`, `navigation`, `display`, `layout`, `foundation`, `effects`. |
| `kind`     | `"component"` \| `"block"` \| `"any"` | Blocks are whole sections assembled from components. Default `any`.                                                                     |

Returns one entry per match — name, whether it is a component or a block, its
category, its status when it is not stable, `Pro` when it needs a licence, its
description, and what it is for when its guidance says — followed by the
install command pattern. With no match, it
says so and how many items the registry has. Utility and theme entries are
never listed; they are installed as dependencies.

### `get_component`

One component or block in full.

| Input            | Type              | Notes                                                             |
| ---------------- | ----------------- | ----------------------------------------------------------------- |
| `name`           | string            | The registry name, e.g. `button`, `ai-prompt-input`, `dashboard`. |
| `include_source` | boolean, optional | Include the full source of every file. Large. Default `false`.    |

Returns the title, description, type, category, status, install command, import
line, the registry items it installs alongside, and its npm packages; then the
component genome:

- **When to use it** — the situations it is for, the ones it is not (naming
  what to use instead), and what it is easily confused with.
- **Often used with** — components a screen built with it tends to need.
- Whether it is a **client component**, and whether it **animates**, both read
  from its source by the registry build.
- **Props** — every prop each exported component declares, with its type,
  default and description, read from the component's own type (cva variants
  included), and the element whose attributes also pass through.

Then its accessibility notes, and either its file paths or — with
`include_source` — the contents of each file.

The name is looked up in the registry index before anything is fetched. An
unknown name returns an error with the closest names (`datatabel` suggests
`data-table`), and says so when the name could never match, because registry
names are lowercase letters, digits and hyphens.

### `get_guide`

The rules for writing code with Dowel, generated from the same registry.

| Input   | Type                                                      |
| ------- | --------------------------------------------------------- |
| `topic` | `"conventions"` \| `"theming"` \| `"ai"` \| `"catalogue"` |

- `conventions` — the styling and accessibility rules that differ from other
  libraries, and how components are added.
- `theming` — the token tiers, presets, and the radius and motion scales.
- `ai` — every AI component, and which to use for what.
- `catalogue` — every component and block, by category.

### `install_command`

The exact command to install one or more items, and everything it will write.

| Input   | Type                       | Notes           |
| ------- | -------------------------- | --------------- |
| `names` | string array, at least one | Registry names. |

Returns `npx @dowel-ui/cli add <names>`, the full list of registry items it
writes with dependencies before the things that need them, which of those were
pulled in automatically, and the npm packages installed alongside. Duplicate
names are listed once. The dependency graph is resolved from the registry
index, so nothing is fetched.

Every name is checked against the index first. If any are unknown, no command
is produced; the error lists each unknown name with its closest matches.

### `plan_ui`

Describe a screen; get the registry items that build it.

| Input    | Type                                       | Notes                                           |
| -------- | ------------------------------------------ | ----------------------------------------------- |
| `prompt` | string, at least 3 characters              | e.g. `"a billing page with usage and invoices"` |
| `format` | `"plan"` \| `"code"` \| `"both"`, optional | Default `both`.                                 |

- `plan` — the blocks and components chosen, the install command, and why each
  was chosen.
- `code` — a starting `.tsx` file that imports and renders the chosen blocks
  and components.
- `both` — the two together.

Every item in a plan is one the registry has. The plan does not include prop
shapes; it ends by telling the agent to call `get_component` for each item,
which lists them, before writing props, and `audit_code` afterwards. When nothing matches, it says so rather than suggesting
something that does not exist.

### `audit_code`

Checks code the agent has written against the design system, before it is
presented. The same rules as `dowel audit`.

| Input       | Type                   | Notes                                                                                 |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `code`      | string                 | The source to check, e.g. one `.tsx` file.                                            |
| `installed` | string array, optional | Registry names installed in the project. Native elements are only reported for these. |

Returns each finding with its line, what matched, the rule, and the replacement
when there is exactly one: a Tailwind palette or literal colour instead of a
semantic token, an arbitrary size off the scale (`p-[12px]` → `p-3`), a
physical direction utility (`ml-2` → `ms-2`), or a native `<button>`,
`<input>`, `<dialog>` and so on when the project has the component. Without
`installed`, native elements are not checked, and the reply says so.

## Pro items

Some items are licensed. The public registry lists them in its index — name,
description, category, what they depend on, how many files — but does not serve
their source. The server is open about that rather than treating them as
missing:

- `search_components` marks them `Pro`.
- `get_component` describes them from the index, gives the install command, and
  says how to install it with a licence: `npx @dowel-ui/cli login` once, or
  `DOWEL_TOKEN` in CI. It does not return source, even with `include_source`,
  because it has none to return; once installed, the files are in the project.
- `install_command` gives the command as usual, with the full dependency list,
  and states that the item needs a licence.
- `plan_ui` states the same when a plan includes one.

The server never sends or reads a licence key. Authentication is the CLI's.

---

<div align="center">

[**Read the docs →**](https://dowel-eight.vercel.app/docs/ai-agents)

MIT licensed

</div>
