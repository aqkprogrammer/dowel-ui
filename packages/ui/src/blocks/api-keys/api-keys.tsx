"use client";

// Original design.
import { useId, useState, type ComponentPropsWithRef, type FormEvent } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/alert-dialog";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/empty-state";
import { Form, FormControl, FormField, FormLabel, FormMessage } from "@/components/form";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { maskSecret, SecretField } from "@/components/secret-field";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";

/*
 * API keys in a settings page: the keys there are, a way to make one, and a
 * way to revoke one.
 *
 * A key is shown once, when it is made — SecretField's shown-once mode, with
 * copy and "I have saved it" — and only its masked form afterwards, as a
 * server that stores a hash would. Making a key asks for a name and at least
 * one permission, checked on submit. Revoking asks first, in a destructive
 * alert dialog that names the key and says what stops working. A status
 * line announces each key made and revoked. The table scrolls inside a
 * named, focusable region on narrow screens.
 */

export interface ApiKey {
  id: string;
  name: string;
  /** What is shown of the key, e.g. "sk_live_…a1b2". */
  preview: string;
  scopes: string[];
  /** ISO date-time. */
  created: string;
  /** ISO date-time, or null if never used. */
  lastUsed?: string | null;
}

export interface ApiKeyScope {
  id: string;
  label: string;
  description?: string;
}

export interface ApiKeysBlockProps extends Omit<ComponentPropsWithRef<"section">, "title"> {
  title?: string;
  description?: string;
  /** The keys there are now. */
  keys?: ApiKey[];
  scopes?: ApiKeyScope[];
  /**
   * Makes a key on the server and returns it with its secret, which is shown
   * once. Without it, a key is made in the browser — for demos only.
   */
  onCreate?: (input: {
    name: string;
    scopes: string[];
  }) => Promise<{ key: ApiKey; secret: string }>;
  /** Revokes a key on the server. Reject to keep it listed. */
  onRevoke?: (id: string) => void | Promise<void>;
  /** Locale for dates. */
  locale?: string;
  /** The headline's level. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const DEFAULT_SCOPES: ApiKeyScope[] = [
  { id: "read", label: "Read", description: "View projects, runs and usage." },
  { id: "write", label: "Write", description: "Create and change projects and runs." },
  { id: "admin", label: "Admin", description: "Manage members, billing and keys." },
];

const DEFAULT_KEYS: ApiKey[] = [
  {
    id: "k1",
    name: "Production server",
    preview: "sk_live_…7f3a",
    scopes: ["read", "write"],
    created: "2026-08-02T09:14:00Z",
    lastUsed: "2026-10-13T08:02:00Z",
  },
  {
    id: "k2",
    name: "CI pipeline",
    preview: "sk_live_…c21e",
    scopes: ["read"],
    created: "2026-06-18T16:40:00Z",
    lastUsed: "2026-10-12T22:47:00Z",
  },
  {
    id: "k3",
    name: "Local testing",
    preview: "sk_test_…09bd",
    scopes: ["read", "write", "admin"],
    created: "2026-09-30T11:05:00Z",
    lastUsed: null,
  },
];

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** A random demo key. Real keys come from your server, through `onCreate`. */
function demoSecret(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto)
    crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return `sk_live_${Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("")}`;
}

/** A settings section to list, create and revoke API keys, showing each new key once. */
export function ApiKeysBlock({
  title = "API keys",
  description = "Keys let your servers call the API. Treat them like passwords.",
  keys: initialKeys = DEFAULT_KEYS,
  scopes = DEFAULT_SCOPES,
  onCreate,
  onRevoke,
  locale,
  headingLevel = 2,
  className,
  ...props
}: ApiKeysBlockProps) {
  const headingId = useId();
  const scopeLabelId = useId();
  const scopeErrorId = useId();
  const Heading = `h${String(headingLevel)}` as `h${typeof headingLevel}`;
  const [keys, setKeys] = useState(initialKeys);
  const [announcement, setAnnouncement] = useState("");
  // The create dialog: closed, the form, or the new key shown once.
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [chosen, setChosen] = useState<string[]>(["read"]);
  const [errors, setErrors] = useState<{ name?: string; scopes?: string; create?: string }>({});
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | undefined>(undefined);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  const dates = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const label = (id: string) => scopes.find((scope) => scope.id === id)?.label ?? id;

  const reset = () => {
    setName("");
    setChosen(["read"]);
    setErrors({});
    setSecret(undefined);
  };

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: typeof errors = {};
    if (!name.trim()) found.name = "Name the key after what will use it.";
    if (chosen.length === 0) found.scopes = "Choose at least one permission.";
    setErrors(found);
    if (found.name || found.scopes) return;
    setCreating(true);
    try {
      const made = onCreate
        ? await onCreate({ name: name.trim(), scopes: chosen })
        : (() => {
            const value = demoSecret();
            return {
              secret: value,
              key: {
                id: `key-${String(Date.now())}`,
                name: name.trim(),
                preview: maskSecret(value),
                scopes: chosen,
                created: new Date().toISOString(),
                lastUsed: null,
              },
            };
          })();
      setKeys((current) => [made.key, ...current]);
      setSecret(made.secret);
      setAnnouncement(`Key “${made.key.name}” created`);
    } catch {
      setErrors({ create: "The key couldn't be created. Please try again." });
    } finally {
      setCreating(false);
    }
  }

  async function revoke(key: ApiKey) {
    try {
      await onRevoke?.(key.id);
      setKeys((current) => current.filter((item) => item.id !== key.id));
      setAnnouncement(`Key “${key.name}” revoked`);
    } catch {
      setAnnouncement(`Key “${key.name}” couldn't be revoked`);
    }
  }

  const createButton = (
    <Button
      onClick={() => {
        reset();
        setOpen(true);
      }}
    >
      Create key
    </Button>
  );

  return (
    <section
      aria-labelledby={headingId}
      data-slot="api-keys"
      className={cn("px-4 py-12 sm:px-6", className)}
      {...props}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <Heading
              id={headingId}
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              {title}
            </Heading>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {keys.length > 0 ? createButton : null}
        </header>

        {keys.length > 0 ? (
          <div
            role="region"
            aria-label={`${title} table`}
            tabIndex={0}
            className={cn("overflow-x-auto rounded-xl border border-border", focusRing)}
          >
            <Table className="min-w-[44rem]">
              <TableCaption className="sr-only">{title}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} data-slot="api-key">
                    <TableCell className="font-medium text-foreground">{key.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {key.preview}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary" size="sm">
                            {label(scope)}
                          </Badge>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <time dateTime={key.created}>{dates.format(new Date(key.created))}</time>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.lastUsed ? (
                        <time dateTime={key.lastUsed}>
                          {dates.format(new Date(key.lastUsed))}
                        </time>
                      ) : (
                        "Never"
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Revoke ${key.name}`}
                        onClick={() => {
                          setRevoking(key);
                        }}
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState bordered>
            <EmptyStateTitle>No API keys yet</EmptyStateTitle>
            <EmptyStateDescription>
              Create a key to call the API from your servers.
            </EmptyStateDescription>
            <EmptyStateActions>{createButton}</EmptyStateActions>
          </EmptyState>
        )}

        <span role="status" className="sr-only">
          {announcement}
        </span>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {secret === undefined ? (
            <>
              <DialogHeader>
                <DialogTitle>Create an API key</DialogTitle>
                <DialogDescription>
                  You'll see the key once, right after it's made.
                </DialogDescription>
              </DialogHeader>
              <Form
                onSubmit={(event) => void create(event)}
                className="gap-5"
                aria-label="Create an API key"
              >
                {errors.create ? (
                  <p role="alert" className="text-sm text-destructive">
                    {errors.create}
                  </p>
                ) : null}
                <FormField name="key-name" error={errors.name}>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      value={name}
                      placeholder="Production server"
                      disabled={creating}
                      onChange={(event) => {
                        setName(event.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormField>
                <fieldset
                  aria-describedby={errors.scopes ? scopeErrorId : undefined}
                  className="flex flex-col gap-3"
                >
                  <legend
                    id={scopeLabelId}
                    className="mb-2 text-sm font-medium text-foreground"
                  >
                    Permissions
                  </legend>
                  {scopes.map((scope) => {
                    const id = `${scopeLabelId}-${scope.id}`;
                    return (
                      <div key={scope.id} className="flex items-start gap-3">
                        <Checkbox
                          id={id}
                          checked={chosen.includes(scope.id)}
                          disabled={creating}
                          aria-describedby={scope.description ? `${id}-description` : undefined}
                          aria-invalid={errors.scopes ? true : undefined}
                          onCheckedChange={(checked) => {
                            setChosen((current) =>
                              checked === true
                                ? [...current, scope.id]
                                : current.filter((item) => item !== scope.id),
                            );
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex flex-col gap-0.5">
                          <Label htmlFor={id}>{scope.label}</Label>
                          {scope.description ? (
                            <span
                              id={`${id}-description`}
                              className="text-xs text-muted-foreground"
                            >
                              {scope.description}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {errors.scopes ? (
                    <p id={scopeErrorId} className="text-sm text-destructive">
                      {errors.scopes}
                    </p>
                  ) : null}
                </fieldset>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={creating}>
                    Create key
                  </Button>
                </DialogFooter>
              </Form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Your new key</DialogTitle>
                <DialogDescription>Copy it now and keep it somewhere safe.</DialogDescription>
              </DialogHeader>
              <SecretField
                label="API key"
                value={secret}
                once
                onAcknowledge={() => {
                  setOpen(false);
                  reset();
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={revoking !== null}
        onOpenChange={(next) => {
          if (!next) setRevoking(null);
        }}
      >
        <AlertDialogContent tone="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>{`Revoke “${revoking?.name ?? ""}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using this key stops working immediately. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revoking) void revoke(revoking);
              }}
            >
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
