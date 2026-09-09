import { componentProps, type PropsGroup } from "~/lib/props.generated";

/**
 * The API of every part a component exports.
 *
 * Generated from the component's own types by `scripts/props.ts`, so this is
 * not documentation about the component — it is the component's signature,
 * rendered. A prop cannot appear here without existing, and cannot exist
 * without appearing.
 *
 * Three things are deliberately not in the table. Inherited DOM attributes,
 * because a table repeating that a div takes `onMouseEnter` buries the four
 * rows a reader came for; the element is named underneath instead. `className`,
 * for the same reason — every component takes it. And a Radix part's props,
 * which belong to Radix and would be a stale copy the day they change.
 */
export function PropsTable({ name }: { name: string }) {
  const groups = componentProps[name];
  if (!groups || groups.length === 0) return null;

  return (
    <section aria-labelledby={`props-${name}`} className="not-prose my-8">
      <h2 id={`props-${name}`} className="text-lg font-semibold tracking-tight">
        Props
      </h2>

      <div className="mt-4 grid gap-6">
        {groups.map((group) => (
          <PartTable key={group.component} group={group} />
        ))}
      </div>
    </section>
  );
}

function PartTable({ group }: { group: PropsGroup }) {
  return (
    <div>
      <h3 className="font-mono text-sm font-medium">{group.component}</h3>

      {group.props.length > 0 ? (
        // Types are long and the page is not: a narrow viewport scrolls the
        // table rather than wrapping a signature into an unreadable column.
        <div className="mt-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th scope="col" className="px-3 py-2 font-medium">
                  Prop
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Default
                </th>
              </tr>
            </thead>
            <tbody>
              {group.props.map((prop) => (
                <tr
                  key={prop.name}
                  className="border-b border-border align-top last:border-b-0"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <code className="font-mono text-xs">{prop.name}</code>
                    {prop.required ? (
                      <>
                        <span aria-hidden className="ml-0.5 text-destructive">
                          *
                        </span>
                        <span className="sr-only"> (required)</span>
                      </>
                    ) : null}
                    {prop.description ? (
                      <p className="mt-1 max-w-sm text-xs text-pretty text-muted-foreground">
                        <Description text={prop.description} />
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <code className="font-mono text-xs text-muted-foreground">{prop.type}</code>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {prop.default ? (
                      <code className="font-mono text-xs text-muted-foreground">
                        {prop.default}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Passthrough group={group} />
    </div>
  );
}

/**
 * Descriptions with `backticks` rendered as code, the way they are written.
 *
 * The JSDoc these come from is written for someone reading the source, where
 * backticks are the convention. Printing them literally on a page that can
 * render the code span they stand for looks like a bug, and these are the
 * pages the site is trying to be read on.
 */
function Description({ text }: { text: string }) {
  // An odd number of backticks means one is unmatched; the split still pairs
  // the rest correctly, and the stray one is shown as written.
  return (
    <>
      {text.split(/`([^`]+)`/g).map((part, index) =>
        index % 2 === 1 ? (
          <code key={index} className="font-mono">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** What else this part accepts, for the props the table does not list. */
function Passthrough({ group }: { group: PropsGroup }) {
  if (group.forwards) {
    const [primitive] = group.forwards.split(".");
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Every prop of Radix UI&rsquo;s{" "}
        <a
          href={`https://www.radix-ui.com/primitives/docs/components/${(primitive ?? "").toLowerCase()}`}
          className="underline underline-offset-2 hover:text-foreground"
          rel="noreferrer"
        >
          <code className="font-mono">{group.forwards}</code>
        </a>
        , plus <code className="font-mono">className</code>.
      </p>
    );
  }

  if (!group.element) return null;

  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Plus every attribute of <code className="font-mono">&lt;{group.element}&gt;</code>
      {group.omitted.length > 0 ? (
        <>
          {" except "}
          {group.omitted.map((name, index) => (
            <span key={name}>
              {index > 0 ? ", " : ""}
              <code className="font-mono">{name}</code>
            </span>
          ))}
        </>
      ) : null}
      .
    </p>
  );
}
