import picomatch from "picomatch";
import type { ImageContext, ImageFormat } from "./types.js";

export type Matcher = (ctx: ImageContext) => boolean;

/**
 * Matches images anywhere under the given directory glob(s), e.g.
 * `inDir("assets/hero")` or `inDir("assets/**\/thumbs")`. Bare directory
 * globs (no `*`) automatically match everything beneath them.
 */
export function inDir(...globs: string[]): Matcher {
  const patterns = globs.flatMap((g) => {
    const normalized = g.replace(/\\/g, "/").replace(/\/+$/, "");
    return [normalized, `${normalized}/**`];
  });
  const isMatch = picomatch(patterns);
  return (ctx) => isMatch(ctx.relativePath);
}

/** Matches images whose relativePath satisfies any of the given globs (alias of inDir, reads better for file-level globs). */
export function pathMatches(...globs: string[]): Matcher {
  const normalized = globs.map((g) => g.replace(/\\/g, "/"));
  const isMatch = picomatch(normalized);
  return (ctx) => isMatch(ctx.relativePath);
}

/** Matches images decoded from one of the given source formats. */
export function hasFormat(...formats: ImageFormat[]): Matcher {
  const set = new Set(formats);
  return (ctx) => set.has(ctx.format);
}

/** Matches images that do/don't carry an alpha channel. Defaults to true (has alpha). */
export function hasAlpha(expected = true): Matcher {
  return (ctx) => ctx.hasAlpha === expected;
}

/** Matches images at or above the given pixel width and/or height. */
export function largerThan(opts: { width?: number; height?: number }): Matcher {
  return (ctx) =>
    (opts.width === undefined || ctx.width >= opts.width) &&
    (opts.height === undefined || ctx.height >= opts.height);
}

/** Matches images at or above the given file size, in bytes. */
export function biggerThan(bytes: number): Matcher {
  return (ctx) => ctx.size >= bytes;
}

/** Combines matchers with logical AND. */
export function and(...matchers: Matcher[]): Matcher {
  return (ctx) => matchers.every((m) => m(ctx));
}

/** Combines matchers with logical OR. */
export function or(...matchers: Matcher[]): Matcher {
  return (ctx) => matchers.some((m) => m(ctx));
}

/** Negates a matcher. */
export function not(matcher: Matcher): Matcher {
  return (ctx) => !matcher(ctx);
}
