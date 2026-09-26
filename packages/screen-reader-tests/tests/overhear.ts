import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { connect } from "node:tls";
import { promisify } from "node:util";

import { getNVDAInstallationPath } from "@guidepup/guidepup/lib/windows/NVDA/getNVDAInstallationPath.js";

/**
 * Everything a screen reader says from now on, commanded or not.
 *
 * Guidepup's `lastSpokenPhrase` and `spokenPhraseLog` hold only what was said
 * in response to one of its own commands: VoiceOver's last phrase is read once
 * per command, and NVDA's speech is collected only while a command runs. A
 * live region speaks between commands, so neither ever records it. These read
 * the screen reader directly instead.
 */
export interface Overheard {
  /** What was said since listening started, in order. */
  heard: () => Promise<string[]>;
  stop: () => Promise<void>;
}

const run = promisify(execFile);

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const LAST_PHRASE = `tell application "VoiceOver"
with transaction
return content of last phrase
end transaction
end tell`;

/**
 * VoiceOver: polls its last phrase. A live region's text is a phrase of its
 * own, and the announcer paces them seconds apart, so a poll this frequent
 * sees each one.
 */
export async function overhearVoiceOver({ everyMs = 100 } = {}): Promise<Overheard> {
  const read = async () => {
    try {
      return (await run("osascript", ["-e", LAST_PHRASE])).stdout.trim();
    } catch {
      return null;
    }
  };

  const said: string[] = [];
  // What was said before listening started is not heard.
  let previous = await read();
  let listening = true;
  const loop = (async () => {
    while (listening) {
      const phrase = await read();
      if (phrase && phrase !== previous) said.push(phrase);
      if (phrase !== null) previous = phrase;
      await wait(everyMs);
    }
  })();

  return {
    heard: () => Promise.resolve([...said]),
    stop: async () => {
      listening = false;
      await loop;
    },
  };
}

/** Where Guidepup's NVDA serves its Remote Access relay, and how to join it. */
const NVDA_HOST = "127.0.0.1";
const NVDA_PORT = 6837;
const JOIN = { type: "join", connection_type: "master", channel: "guidepup" };
const PROTOCOL = { type: "protocol_version", version: 2 };

function nvdaCertificate(): Buffer {
  const executable = getNVDAInstallationPath();
  if (!executable) throw new Error("NVDA is not installed: run `npx @guidepup/setup`.");
  const root = dirname(executable);
  for (const path of [
    join(root, "userConfig", "remoteAccess", "localRelay", "NvdaRemoteRelay.pem"),
    join(root, "userConfig", "addons", "remote", "globalPlugins", "remoteClient", "server.pem"),
  ]) {
    try {
      return readFileSync(path);
    } catch {
      // Older NVDA keeps it in the Remote add-on.
    }
  }
  throw new Error("NVDA's Remote Access certificate was not found.");
}

/**
 * NVDA: joins the Remote Access channel Guidepup drives it through, as a
 * second controller. The relay passes every speech message to each controller,
 * so this hears all of it without taking anything from Guidepup.
 */
export function overhearNVDA(): Promise<Overheard> {
  const said: string[] = [];
  let pending = "";

  return new Promise((resolve, reject) => {
    const socket = connect(
      NVDA_PORT,
      NVDA_HOST,
      { ca: [nvdaCertificate()], checkServerIdentity: () => undefined },
      () => {
        socket.write(`${JSON.stringify(JOIN)}\n`);
        socket.write(`${JSON.stringify(PROTOCOL)}\n`);
      },
    );
    socket.setEncoding("utf8");
    socket.once("error", reject);
    socket.on("data", (data: string) => {
      // Messages are one JSON object a line, and a read can end mid-line.
      pending += data;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        let message: { type?: string; sequence?: unknown[] };
        try {
          message = JSON.parse(line) as typeof message;
        } catch {
          continue;
        }
        if (message.type === "channel_joined") {
          resolve({
            heard: () => Promise.resolve([...said]),
            stop: () => {
              socket.destroy();
              return Promise.resolve();
            },
          });
        }
        if (message.type !== "speak") continue;
        const phrase = (message.sequence ?? [])
          .filter((part): part is string => typeof part === "string")
          .map((part) => part.trim().replaceAll(/\s\s+/g, " "))
          .filter(Boolean)
          .join(", ");
        if (phrase) said.push(phrase);
      }
    });
  });
}
