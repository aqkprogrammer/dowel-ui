import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit in a window, then says how long to wait", () => {
    const limiter = createRateLimiter(2, 60_000);
    expect(limiter.take("a", 0)).toEqual({ allowed: true });
    expect(limiter.take("a", 10_000)).toEqual({ allowed: true });
    expect(limiter.take("a", 20_000)).toEqual({ allowed: false, retryAfter: 40 });
  });

  it("counts each key on its own", () => {
    const limiter = createRateLimiter(1, 60_000);
    expect(limiter.take("a", 0)).toEqual({ allowed: true });
    expect(limiter.take("b", 0)).toEqual({ allowed: true });
    expect(limiter.take("a", 1)).toMatchObject({ allowed: false });
  });

  it("starts again once the window has passed", () => {
    const limiter = createRateLimiter(1, 60_000);
    limiter.take("a", 0);
    expect(limiter.take("a", 59_999)).toMatchObject({ allowed: false });
    expect(limiter.take("a", 60_000)).toEqual({ allowed: true });
  });
});
