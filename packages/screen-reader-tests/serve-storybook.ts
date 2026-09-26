/**
 * Serves the static Storybook build for the screen reader tests.
 *
 * CI does not use Storybook's dev server: its first request sets Vite
 * bundling dependencies and can reload the page under the test, which on a
 * cold runner left the story unrendered for the whole run. A built Storybook
 * is the same stories, fixed on disk. No dependencies, so it runs the same on
 * the Ubuntu, macOS and Windows runners.
 *
 *   pnpm --filter @dowel-ui/react build-storybook && node serve-storybook.ts
 */
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const root = join(import.meta.dirname, "..", "ui", "storybook-static");
const port = Number(process.env.PORT ?? 6007);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const relative = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  if (relative.split(sep).includes("..")) {
    response.writeHead(400).end();
    return;
  }
  let file = join(root, relative || "index.html");
  stat(file)
    .then((info) => {
      if (info.isDirectory()) file = join(file, "index.html");
      return readFile(file);
    })
    .then((body) => {
      response.writeHead(200, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      });
      response.end(body);
    })
    .catch(() => {
      response.writeHead(404).end("Not found");
    });
}).listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${String(port)}`);
});
