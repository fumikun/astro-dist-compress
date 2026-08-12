import { describe, expect, it } from "vitest";
import { and, biggerThan, hasAlpha, hasFormat, inDir, largerThan, not, or, pathMatches } from "../matchers.js";
import type { ImageContext } from "../types.js";

function ctx(overrides: Partial<ImageContext> = {}): ImageContext {
  return {
    relativePath: "assets/hero/photo.png",
    absolutePath: "/dist/assets/hero/photo.png",
    dir: "assets/hero",
    fileName: "photo.png",
    extension: "png",
    format: "png",
    hasAlpha: true,
    width: 800,
    height: 600,
    size: 10_000,
    ...overrides,
  };
}

describe("matchers", () => {
  it("inDir matches by directory glob", () => {
    expect(inDir("assets/hero")(ctx())).toBe(true);
    expect(inDir("assets/hero/**")(ctx())).toBe(true);
    expect(inDir("assets/footer")(ctx())).toBe(false);
  });

  it("pathMatches matches the full relative path", () => {
    expect(pathMatches("**/*.png")(ctx())).toBe(true);
    expect(pathMatches("**/*.jpg")(ctx())).toBe(false);
  });

  it("hasFormat matches any of the given formats", () => {
    expect(hasFormat("png", "webp")(ctx())).toBe(true);
    expect(hasFormat("avif")(ctx())).toBe(false);
  });

  it("hasAlpha matches presence or absence of alpha", () => {
    expect(hasAlpha(true)(ctx({ hasAlpha: true }))).toBe(true);
    expect(hasAlpha(false)(ctx({ hasAlpha: true }))).toBe(false);
    expect(hasAlpha(false)(ctx({ hasAlpha: false }))).toBe(true);
  });

  it("largerThan and biggerThan compare dimensions and file size", () => {
    expect(largerThan({ width: 800 })(ctx({ width: 800 }))).toBe(true);
    expect(largerThan({ width: 801 })(ctx({ width: 800 }))).toBe(false);
    expect(biggerThan(5_000)(ctx({ size: 10_000 }))).toBe(true);
    expect(biggerThan(20_000)(ctx({ size: 10_000 }))).toBe(false);
  });

  it("and/or/not combine matchers", () => {
    const m = and(hasFormat("png"), hasAlpha(true));
    expect(m(ctx())).toBe(true);
    expect(m(ctx({ hasAlpha: false }))).toBe(false);

    const o = or(hasFormat("avif"), hasFormat("png"));
    expect(o(ctx())).toBe(true);

    expect(not(hasAlpha(true))(ctx({ hasAlpha: false }))).toBe(true);
  });
});
