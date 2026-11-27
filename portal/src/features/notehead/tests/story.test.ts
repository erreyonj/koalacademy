import { describe, expect, it } from "vitest";
import { enterStoryReady, interruptsForEvent } from "../modules/story";
import { eventsFor } from "../routes/events";
import { getRoute } from "../routes/registry";

describe("enter stories", () => {
  const seated = { pending: true, phase: "idle", seated: true, mustCatch: false };

  it("waits for the ship to seat on a normal level", () => {
    expect(enterStoryReady(seated)).toBe(true);
    expect(enterStoryReady({ ...seated, seated: false, phase: "flight" })).toBe(false);
    expect(enterStoryReady({ ...seated, pending: false })).toBe(false);
  });

  it("opens in flight for a mustCatch Enter point", () => {
    const flying = { pending: true, phase: "flight", seated: false, mustCatch: true };
    expect(enterStoryReady(flying)).toBe(true);
    expect(enterStoryReady({ ...flying, pending: false })).toBe(false);
    expect(enterStoryReady({ ...flying, phase: "pulling" })).toBe(false);
  });

  it("warns the player on zig1perspective", () => {
    const events = eventsFor("zig1perspective", "zig1perspective");
    expect(events.enter).toEqual(["zig-perspective-enter"]);
    const [cm] = interruptsForEvent("zig-perspective-enter");
    expect(cm?.kind).toBe("cm");
    expect(cm?.lines.join(" ")).toContain("gravitational readings");
    const level = getRoute("zig1perspective").scenes.get("zig1perspective")!.level;
    expect(level.enter?.mustCatch).toBe(true);
  });
});
