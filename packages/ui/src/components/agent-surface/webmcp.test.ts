import { afterEach, describe, expect, it, vi } from "vitest";

import { getModelContext, isWebMCPAvailable, registerWebMCPTool } from "./webmcp";

const DEFINITION = { name: "sort", description: "Sort the table" };
const execute = () => Promise.resolve({ content: [{ type: "text" as const, text: "ok" }] });

function install(target: object, value: unknown) {
  Object.defineProperty(target, "modelContext", { value, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(document, "modelContext");
  Reflect.deleteProperty(navigator, "modelContext");
  vi.restoreAllMocks();
});

describe("WebMCP adapter", () => {
  it("does nothing where the browser has no model context", () => {
    expect(isWebMCPAvailable()).toBe(false);
    expect(() => {
      registerWebMCPTool(DEFINITION, execute)();
    }).not.toThrow();
  });

  it("prefers document.modelContext, the current entry point", () => {
    const current = { registerTool: vi.fn(() => Promise.resolve()) };
    const earlier = { registerTool: vi.fn() };
    install(document, current);
    install(navigator, earlier);
    expect(getModelContext()).toBe(current);
  });

  it("falls back to navigator.modelContext, the earlier one", () => {
    const earlier = { registerTool: vi.fn() };
    install(navigator, earlier);
    expect(getModelContext()).toBe(earlier);
  });

  it("ignores a model context without registerTool", () => {
    install(document, { provideContext: vi.fn() });
    expect(isWebMCPAvailable()).toBe(false);
  });

  it("registers with a signal and removes by aborting it", () => {
    const registerTool = vi.fn((..._args: unknown[]) => Promise.resolve());
    install(document, { registerTool });

    const remove = registerWebMCPTool(DEFINITION, execute);
    const [tool, options] = registerTool.mock.calls[0] as [
      { name: string; execute: unknown },
      { signal: AbortSignal },
    ];
    expect(tool.name).toBe("sort");
    expect(tool.execute).toBe(execute);
    expect(options.signal.aborted).toBe(false);

    remove();
    expect(options.signal.aborted).toBe(true);
  });

  it("uses an early draft's handle to unregister", () => {
    const unregister = vi.fn();
    install(document, { registerTool: vi.fn(() => ({ unregister })) });
    registerWebMCPTool(DEFINITION, execute)();
    expect(unregister).toHaveBeenCalledOnce();
  });

  it("uses unregisterTool where an early draft has it", () => {
    const unregisterTool = vi.fn();
    install(navigator, { registerTool: vi.fn(), unregisterTool });
    registerWebMCPTool(DEFINITION, execute)();
    expect(unregisterTool).toHaveBeenCalledWith("sort");
  });

  it("keeps the page working when registration throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    install(document, {
      registerTool: () => {
        throw new DOMException("no", "NotAllowedError");
      },
    });
    expect(() => {
      registerWebMCPTool(DEFINITION, execute)();
    }).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it("reports a rejected registration in development", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    install(document, { registerTool: () => Promise.reject(new Error("bad name")) });
    registerWebMCPTool(DEFINITION, execute);
    await Promise.resolve();
    await Promise.resolve();
    expect(warn).toHaveBeenCalled();
  });

  it("swallows errors while removing", () => {
    install(document, {
      registerTool: () => ({
        unregister: () => {
          throw new Error("already gone");
        },
      }),
    });
    expect(() => {
      registerWebMCPTool(DEFINITION, execute)();
    }).not.toThrow();
  });
});
