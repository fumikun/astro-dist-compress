import { and, hasAlpha, hasFormat } from "./matchers.js";
import type { CompressRule } from "./types.js";

/**
 * Default rule set, matching the brief:
 *  - PNG with an alpha channel  -> WebP (lossless-ish, keeps transparency)
 *  - PNG without an alpha channel -> AVIF (best compression for opaque photos/art)
 *  - JPEG                        -> AVIF
 * A WebP fallback is added on top of all of these by the default
 * `fallback` config (see resolveOptions), so AVIF outputs always ship a
 * WebP `<source>` for browsers without AVIF support.
 */
export const defaultRules: CompressRule[] = [
  {
    name: "png-with-alpha -> webp",
    match: and(hasFormat("png"), hasAlpha(true)),
    outputs: [{ format: "webp", options: { quality: 80 }, fallback: true }],
  },
  {
    name: "png-without-alpha -> avif",
    match: and(hasFormat("png"), hasAlpha(false)),
    outputs: [{ format: "avif", options: { quality: 55 } }],
  },
  {
    name: "jpeg -> avif",
    match: hasFormat("jpeg", "jpg"),
    outputs: [{ format: "avif", options: { quality: 55 } }],
  },
];
