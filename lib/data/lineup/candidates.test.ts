import { describe, expect, it } from "vitest";
import { buildClassLineupItems } from "./candidates";

type Member = {
  id: string;
  firstName: string;
  lastInitial: string | null;
  lifetimeClassCount: number;
  birthday: Date | null;
  checkIns1Week: number | null;
  optOutFlag: boolean;
};

function member(over: Partial<Member> = {}): Member {
  return {
    id: "m1",
    firstName: "Pat",
    lastInitial: "K",
    lifetimeClassCount: 5,
    birthday: null,
    checkIns1Week: null,
    optOutFlag: false,
    ...over,
  };
}

function checkIn(m: Member, over: { isGuest?: boolean; guestFirstName?: string | null } = {}) {
  return {
    isGuest: over.isGuest ?? false,
    guestFirstName: over.guestFirstName ?? null,
    member: m,
  };
}

const base = {
  classSessionId: "c1",
  classType: "Hot Union Flow",
  instructorName: "Sam",
  now: new Date(2026, 4, 27, 9, 0), // local May 27
};

function build(checkIns: ReturnType<typeof checkIn>[], now = base.now) {
  return buildClassLineupItems({ ...base, now, checkIns });
}

function keys(items: ReturnType<typeof build>) {
  return items.map((i) => i.sceneKey);
}

describe("buildClassLineupItems", () => {
  it("always emits a room-overview with zeroed counts when empty", () => {
    const items = build([]);
    expect(items).toHaveLength(1);
    expect(items[0].sceneKey).toBe("room-overview");
    expect(items[0].payload).toMatchObject({
      regularCount: 0,
      firstTimerCount: 0,
      checkedInCount: 0,
    });
  });

  it("splits regulars vs newer by the <=3 threshold", () => {
    const items = build([
      checkIn(member({ id: "a", lifetimeClassCount: 1 })),
      checkIn(member({ id: "b", lifetimeClassCount: 3 })),
      checkIn(member({ id: "c", lifetimeClassCount: 4 })),
    ]);
    expect(items[0].payload).toMatchObject({
      firstTimerCount: 2,
      regularCount: 1,
      checkedInCount: 3,
    });
  });

  it("emits welcome-first (and not welcome-returning) for a brand-new member", () => {
    const items = build([checkIn(member({ id: "a", lifetimeClassCount: 0 }))]);
    expect(keys(items)).toContain("welcome-first");
    expect(keys(items)).not.toContain("welcome-returning");
  });

  it("emits welcome-returning for an experienced member", () => {
    const items = build([checkIn(member({ id: "a", lifetimeClassCount: 12 }))]);
    const returning = items.find((i) => i.sceneKey === "welcome-returning")!;
    expect(returning.defaultEnabled).toBe(true);
  });

  it("excludes opted-out members from student scenes", () => {
    const items = build([checkIn(member({ id: "a", optOutFlag: true }))]);
    // only room-overview, counts are 0 because opted-out is filtered
    expect(keys(items)).toEqual(["room-overview"]);
    expect(items[0].payload).toMatchObject({ checkedInCount: 0 });
  });

  it("emits a birthday scene on the local birthday only", () => {
    const onBirthday = build([
      checkIn(member({ id: "a", lifetimeClassCount: 5, birthday: new Date(1990, 4, 27) })),
    ]);
    expect(keys(onBirthday)).toContain("birthday");

    // Same member, evening before — must NOT trigger (Greg N regression).
    const dayBefore = build(
      [checkIn(member({ id: "a", lifetimeClassCount: 5, birthday: new Date(1990, 4, 28) }))],
      new Date(2026, 4, 27, 20, 0)
    );
    expect(keys(dayBefore)).not.toContain("birthday");
  });

  it("emits a streak scene only on milestone weeks", () => {
    expect(keys(build([checkIn(member({ id: "a", checkIns1Week: 4 }))]))).toContain("streak");
    expect(keys(build([checkIn(member({ id: "a", checkIns1Week: 5 }))]))).not.toContain("streak");
  });

  it("emits a milestone scene when within 2 of a target", () => {
    const hit = build([checkIn(member({ id: "a", lifetimeClassCount: 10 }))]);
    const m = hit.find((i) => i.sceneKey === "milestone")!;
    expect(m.payload).toMatchObject({ target: 10, classesUntil: 0 });

    const near = build([checkIn(member({ id: "a", lifetimeClassCount: 9 }))]);
    expect(near.find((i) => i.sceneKey === "milestone")!.payload).toMatchObject({
      target: 10,
      classesUntil: 1,
    });

    const none = build([checkIn(member({ id: "a", lifetimeClassCount: 7 }))]);
    expect(keys(none)).not.toContain("milestone");
  });

  it("emits a bring-a-friend scene for a guest with host name", () => {
    const host = member({ id: "h", firstName: "Dana", lastInitial: "R" });
    const items = build([checkIn(host, { isGuest: true, guestFirstName: "Lee" })]);
    const guest = items.find((i) => i.sceneKey === "bring-a-friend")!;
    expect(guest.payload).toMatchObject({ guestFirstName: "Lee", hostFirstName: "Dana" });
  });

  it("masks an opted-out host name on the guest scene", () => {
    const host = member({ id: "h", firstName: "Dana", lastInitial: "R", optOutFlag: true });
    const items = build([checkIn(host, { isGuest: true, guestFirstName: "Lee" })]);
    const guest = items.find((i) => i.sceneKey === "bring-a-friend")!;
    expect(guest.payload).toMatchObject({ hostFirstName: "A member", hostLastInitial: null });
  });

  it("gives each item a unique itemKey", () => {
    const items = build([
      checkIn(member({ id: "a", lifetimeClassCount: 10, checkIns1Week: 4, birthday: new Date(1990, 4, 27) })),
      checkIn(member({ id: "b", lifetimeClassCount: 0 })),
    ]);
    const itemKeys = items.map((i) => i.itemKey);
    expect(new Set(itemKeys).size).toBe(itemKeys.length);
  });
});
