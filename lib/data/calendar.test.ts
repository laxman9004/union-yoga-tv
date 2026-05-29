import { describe, expect, it } from "vitest";
import { dayRange } from "./calendar";
import { studioDayKey } from "./dates";

describe("dayRange", () => {
  it("returns past + today + future days inclusive", () => {
    const center = new Date("2026-05-27T16:00:00.000Z"); // noon EDT May 27
    const range = dayRange(center, 2, 3);
    expect(range).toHaveLength(6); // 2 past + today + 3 future
    expect(range.map(studioDayKey)).toEqual([
      "2026-05-25",
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
      "2026-05-29",
      "2026-05-30",
    ]);
  });

  it("crosses a month boundary correctly", () => {
    const center = new Date("2026-05-30T16:00:00.000Z");
    const range = dayRange(center, 0, 3);
    expect(range.map(studioDayKey)).toEqual([
      "2026-05-30",
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
    ]);
  });

  it("each entry is studio midnight (04:00Z in EDT)", () => {
    const center = new Date("2026-05-27T16:00:00.000Z");
    const [first] = dayRange(center, 0, 0);
    expect(first.toISOString()).toBe("2026-05-27T04:00:00.000Z");
  });

  it("handles the DST boundary without skipping a day", () => {
    // US DST springs forward 2026-03-08. Range spanning it stays contiguous.
    const center = new Date("2026-03-07T17:00:00.000Z"); // noon EST Mar 7
    const range = dayRange(center, 1, 2);
    expect(range.map(studioDayKey)).toEqual([
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
    ]);
    // Mar 7 is EST (-5h → 05:00Z), Mar 9 is EDT (-4h → 04:00Z).
    expect(range[1].toISOString()).toBe("2026-03-07T05:00:00.000Z");
    expect(range[3].toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });
});
