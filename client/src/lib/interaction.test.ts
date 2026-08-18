import { describe, expect, it } from "vitest";
import { getCircularIndex } from "./interaction";

describe("getCircularIndex", () => {
  it("moves forward and wraps at the end", () => {
    expect(getCircularIndex(2, 1, 3)).toBe(0);
  });

  it("moves backward and wraps at the start", () => {
    expect(getCircularIndex(0, -1, 14)).toBe(13);
  });

  it("returns a stable fallback for an empty collection", () => {
    expect(getCircularIndex(4, 1, 0)).toBe(0);
  });
});
