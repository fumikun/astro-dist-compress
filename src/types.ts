/** Raster formats this plugin knows how to read and/or write. */
export type ImageFormat = "avif" | "webp" | "png" | "jpeg" | "jpg" | "gif" | "tiff";

/** Everything known about a single image in the dist output at match time. */
export interface ImageContext {
  /** Path relative to the build output root, e.g. "assets/hero/photo.png". Always uses "/" separators. */
  relativePath: string;
  /** Absolute path to the file on disk. */
  absolutePath: string;
  /** Directory portion of relativePath, e.g. "assets/hero". "" for root. */
  dir: string;
  /** File name without directory, e.g. "photo.png". */
  fileName: string;
  /** Lowercase extension without the dot, e.g. "png". */
  extension: string;
  /** Detected source format (from image bytes, not just the extension). */
  format: ImageFormat;
  /** Whether the image has an alpha channel. */
  hasAlpha: boolean;
  /** Pixel width. */
  width: number;
  /** Pixel height. */
  height: number;
  /** File size in bytes, on disk. */
  size: number;
}

/** Sharp encode options, kept loose so callers don't need sharp's types installed. */
export type EncodeOptions = Record<string, unknown>;

export interface OutputTarget {
  /** Target format to encode to. */
  format: ImageFormat;
  /** Options passed straight through to sharp's `.toFormat(format, options)`. */
  options?: EncodeOptions;
  /**
   * Marks this output as *the* fallback image: the one referenced by the
   * plain `<img src>` (and the final, format-less `<source>`) when the HTML
   * is rewritten. Exactly one output per rule should set this; if none do,
   * the original source file is used as the fallback instead.
   */
  fallback?: boolean;
  /** Suffix appended before the extension when the target format matches the source format, to avoid overwriting the original (default: "-compressed"). */
  sameFormatSuffix?: string;
  /**
   * Generate multiple width-resized variants of this output for responsive
   * `srcset`, e.g. `[320, 640, 1280]`. Widths larger than the source image's
   * width are skipped (no upscaling); if every requested width exceeds the
   * source, a single output at the source's own width is produced instead.
   * Each variant's file name gets a `-{width}w` suffix.
   */
  widths?: number[];
  /** `sizes` attribute to emit on the generated `<source>` (or `<img>`, for the fallback) when `widths` produces more than one variant. */
  sizes?: string;
}

export interface CompressRule {
  /** Optional label, used only in log output. */
  name?: string;
  /** Decides whether this rule applies to a given image. Rules are tried in order; the first match wins. */
  match: (ctx: ImageContext) => boolean;
  /** Formats to produce for images matched by this rule. */
  outputs: OutputTarget[];
  /** Delete the original file once outputs have been written. Overrides the global `removeOriginal`. */
  removeOriginal?: boolean;
}

export interface FallbackConfig {
  /**
   * When true, every rule's output list is guaranteed to include the
   * fallback format below, added automatically if the rule didn't already
   * request it. This is what makes "generate a webp fallback for
   * everything" a one-line, global setting instead of per-rule boilerplate.
   */
  enabled?: boolean;
  /** Format to auto-add as a fallback. Default: "webp". */
  format?: ImageFormat;
  /** Encode options for the auto-added fallback output. */
  options?: EncodeOptions;
}

export interface AstroDistCompressOptions {
  /**
   * Ordered list of compression/conversion rules. The first rule whose
   * `match` returns true is used for a given image; images matching no
   * rule are left untouched. Defaults to `defaultRules` (PNG w/ alpha -> webp,
   * PNG w/o alpha -> avif) when omitted.
   */
  rules?: CompressRule[];
  /**
   * Global fallback behaviour, layered on top of `rules`. Set to `false` to
   * disable. Defaults to `{ enabled: true, format: "webp" }`.
   */
  fallback?: FallbackConfig | false;
  /**
   * Rewrite `<img>` tags in the built HTML into `<picture>` elements with a
   * `<source>` per generated format (best format first) and the original
   * file (or the rule's `fallback` output) as the final `<img src>`.
   * Default: true.
   */
  rewriteHtml?: boolean;
  /**
   * Delete original source files once their outputs exist, globally. Only
   * takes effect where `rewriteHtml` is enabled (or the file has a
   * `fallback` output), otherwise the reference in the HTML would break.
   * Per-rule `removeOriginal` overrides this. Default: false.
   */
  removeOriginal?: boolean;
  /** File extensions (without dot) to scan for in the dist output. Default: png, jpg, jpeg. */
  extensions?: string[];
  /** Glob patterns (relative to the dist root) to skip entirely. Default: []. */
  exclude?: string[];
  /** Number of images to process concurrently. Default: 4. */
  concurrency?: number;
  /** Log progress and a summary of bytes saved. Default: true. */
  logger?: boolean;
}

/** Fully-resolved options, after defaults have been applied. */
export interface ResolvedOptions {
  rules: CompressRule[];
  fallback: Required<FallbackConfig> | false;
  rewriteHtml: boolean;
  removeOriginal: boolean;
  extensions: string[];
  exclude: string[];
  concurrency: number;
  logger: boolean;
}
