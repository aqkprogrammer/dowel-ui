import { spawn, spawnSync } from "node:child_process";

/**
 * The environment for anything run inside a workspace.
 *
 * Run through `pnpm bench`, this process inherits pnpm's `npm_*` variables —
 * the user agent, the workspace directory, config overrides — and a package
 * manager or an agent started in the workspace would read them as its own
 * settings. The workspace is meant to look like a project someone just
 * created, so they are dropped.
 */
export function workspaceEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(npm|pnpm)_/i.test(key) || key === "PNPM_SCRIPT_SRC_DIR" || key === "INIT_CWD")
      continue;
    env[key] = value;
  }
  return { ...env, ...extra };
}

export interface ExecResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

/** Runs a command to completion and returns what it printed, whatever its exit code. */
export function execSync(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number },
): ExecResult {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    timeout: options.timeoutMs,
    // A typecheck of a large page or a verbose agent can print more than
    // Node's 1 MB default, and a truncated transcript is a lost one.
    maxBuffer: 64 * 1024 * 1024,
  });

  // spawnSync reports a timeout as an error with code ETIMEDOUT; that one is a
  // result to return, anything else (the command not existing) is thrown.
  const timedOut =
    result.error !== undefined && "code" in result.error && result.error.code === "ETIMEDOUT";
  if (result.error && !timedOut) throw result.error;

  return {
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs: Date.now() - started,
    timedOut,
  };
}

/** Like execSync, but throws with the command's output when it does not exit 0. */
export function execOrThrow(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs?: number },
): ExecResult {
  const result = execSync(command, args, options);
  if (result.exitCode !== 0) {
    throw new Error(
      `\`${[command, ...args].join(" ")}\` exited ${String(result.exitCode)} in ${options.cwd}\n` +
        `${result.stdout}\n${result.stderr}`.trim(),
    );
  }
  return result;
}

/**
 * Runs a long command without blocking the event loop, killing it at the
 * timeout.
 *
 * Asynchronous because an agent run takes minutes; stdin is closed so a tool
 * that unexpectedly asks a question fails instead of waiting forever.
 */
export function execAsync(
  command: string,
  args: string[],
  options: { cwd: string; env?: NodeJS.ProcessEnv; timeoutMs: number },
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code, stdout, stderr, durationMs: Date.now() - started, timedOut });
    });
  });
}
