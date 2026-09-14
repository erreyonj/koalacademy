import { describe, expect, it } from "vitest";
import { cleanText, isSubmittable, normKey } from "../normalize";

// Mirrors sb_private.norm() in the migration — if one changes, both must.

describe("normKey", () => {
  it("lowercases and strips punctuation and spacing", () => {
    expect(normKey("Air Guitar")).toBe("airguitar");
    expect(normKey("  kick   drum  ")).toBe("kickdrum");
    expect(normKey("don't-stop")).toBe("dontstop");
  });

  it("folds ! to i even mid-word — catching sh!t beats exact dedupe on trailing bangs", () => {
    expect(normKey("sh!t")).toBe("shit");
    expect(normKey("Air Guitar!")).toBe("airguitari");
  });

  it("folds common leetspeak so blocked terms can't be dodged", () => {
    expect(normKey("B0MB@CLAAT")).toBe("bombaclaat");
    expect(normKey("5h1t")).toBe("shit");
    expect(normKey("a$$")).toBe("ass");
    expect(normKey("7hot")).toBe("thot");
  });

  it("collapses the classic duplicate variants to one key", () => {
    expect(normKey("6 7")).toBe(normKey("67"));
    expect(normKey("six-seven")).toBe(normKey("Six Seven"));
    expect(normKey("8-0-8")).toBe(normKey("808"));
  });

  it("maps the exact SQL translate() table", () => {
    // '0134578@$!' -> 'oieastbasi'
    expect(normKey("0")).toBe("o");
    expect(normKey("1")).toBe("i");
    expect(normKey("3")).toBe("e");
    expect(normKey("4")).toBe("a");
    expect(normKey("5")).toBe("s");
    expect(normKey("7")).toBe("t");
    expect(normKey("8")).toBe("b");
    expect(normKey("@")).toBe("a");
    expect(normKey("$")).toBe("s");
    expect(normKey("!")).toBe("i");
  });

  it("returns empty for content-free input", () => {
    expect(normKey("")).toBe("");
    expect(normKey("   ")).toBe("");
    expect(normKey("?!,.")).toBe("i"); // '!' folds to i — still non-empty, by design
    expect(normKey("---")).toBe("");
  });
});

describe("cleanText", () => {
  it("trims and collapses internal whitespace like the server", () => {
    expect(cleanText("  hi   there \n")).toBe("hi there");
  });
});

describe("isSubmittable", () => {
  it("accepts short real entries", () => {
    expect(isSubmittable("808")).toBe(true);
    expect(isSubmittable("quarter note")).toBe(true);
  });

  it("rejects empty-after-normalisation and oversized entries", () => {
    expect(isSubmittable("   ")).toBe(false);
    expect(isSubmittable("-- --")).toBe(false);
    expect(isSubmittable("x".repeat(61))).toBe(false);
  });
});
