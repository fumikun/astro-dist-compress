# astro-dist-compress

An Astro integration that compresses and converts images in your **build output (`dist`)**.
Unlike [`astro-compress`](https://github.com/astro-community/astro-compress), it lets you define conversion rules in TypeScript that flexibly depend on an image's **format, transparency, and directory**, and it automatically generates fallback images and rewrites HTML `<img>` tags into `<picture>`.

- It does **nothing** during the dev server (`astro dev`). The `astro:build:done` hook only fires on build, so no special mode-detection code is needed.
- After `astro build` finishes, it scans `dist`, converts images, and — if needed — rewrites `<img>` tags to reference the generated files as `<picture>`.

## Documentation (English / 日本語)

A more detailed guide and API reference are available on the VitePress site (English and Japanese).

```bash
npm run docs:dev      # preview at http://localhost:5173
npm run docs:build    # static build into docs/.vitepress/dist
```

## Install

```bash
npm install astro-dist-compress
```

## Quick start

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import distCompress from "astro-dist-compress";

export default defineConfig({
  integrations: [distCompress()],
});
```

The default configuration behaves as follows:

- PNG with transparency → **WebP**
- PNG without transparency → **AVIF**
- JPEG → **AVIF**
- A **WebP fallback is auto-generated** for all of the above (not added again if a rule already outputs WebP)
- Matching `<img>` tags in the build output's HTML are automatically rewritten into `<picture>`
- Original files are kept by default (`removeOriginal: false`)

## Rules per directory / image state

`rules` is a TypeScript array; the first matching rule (top to bottom) is used. `match` is a predicate function that receives an `ImageContext`.

```ts
import { defineConfig } from "astro/config";
import distCompress, { and, hasAlpha, hasFormat, inDir, biggerThan } from "astro-dist-compress";

export default defineConfig({
  integrations: [
    distCompress({
      rules: [
        // Only images under /assets/hero get more aggressive AVIF compression
        {
          name: "hero images -> aggressive avif",
          match: inDir("assets/hero"),
          outputs: [{ format: "avif", options: { quality: 40 } }],
        },
        // Only convert large transparent PNGs — leave small icons alone
        {
          name: "large png-with-alpha -> webp",
          match: and(hasFormat("png"), hasAlpha(true), biggerThan(20_000)),
          outputs: [{ format: "webp", options: { quality: 82 }, fallback: true }],
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
      ],
      fallback: { enabled: true, format: "webp" },
    }),
  ],
});
```

### Built-in matchers (`src/matchers.ts`)

| Function | Description |
| --- | --- |
| `inDir(...globs)` | Matches images under the given directory globs (e.g. `assets/hero` matches everything below it) |
| `pathMatches(...globs)` | Matches the full relative path against globs (e.g. `"**/icons/*.png"`) |
| `hasFormat(...formats)` | Matches by source format (`"png" | "jpeg" | ...`) |
| `hasAlpha(expected?)` | Matches by presence/absence of an alpha channel |
| `largerThan({ width?, height?})` | Matches images at or above the given pixel dimensions |
| `biggerThan(bytes)` | Matches images at or above the given file size |
| `and / or / not` | Combine matchers |

You can also write `match: (ctx) => boolean` directly. `ImageContext` includes `relativePath`, `dir`, `format`, `hasAlpha`, `width`, `height`, and `size`.

## Responsive images (`srcset`)

Setting `widths` on an `OutputTarget` generates several width-resized variants of that output (e.g. `photo-320w.webp`) and wires them up as a `srcset` (with `w` descriptors) when rewriting `<picture>`. Add `sizes` too, and it's applied to the corresponding `<source>` (or the fallback `<img>`) as a `sizes` attribute.

```ts
distCompress({
  rules: [
    {
      match: hasFormat("jpeg", "jpg"),
      outputs: [
        { format: "avif", widths: [320, 640, 1280], sizes: "(min-width: 768px) 50vw, 100vw" },
        { format: "webp", widths: [320, 640, 1280], sizes: "(min-width: 768px) 50vw, 100vw", fallback: true },
      ],
    },
  ],
});
```

```html
<!-- Before -->
<img src="/images/photo.jpg" alt="..." />

<!-- After -->
<picture>
  <source
    srcset="/images/photo-320w.avif 320w, /images/photo-640w.avif 640w, /images/photo-1280w.avif 1280w"
    type="image/avif"
    sizes="(min-width: 768px) 50vw, 100vw"
  />
  <img
    src="/images/photo-1280w.webp"
    srcset="/images/photo-320w.webp 320w, /images/photo-640w.webp 640w, /images/photo-1280w.webp 1280w"
    sizes="(min-width: 768px) 50vw, 100vw"
    alt="..."
  />
</picture>
```

- Widths larger than the source image are automatically skipped to avoid upscaling. If every requested width exceeds the source, a single output at the source's own width is produced instead.
- Outputs without `widths` behave exactly as before: a single file, no `srcset`.

## Automatic fallback

The `fallback` option automatically adds a fallback output in the given format to **every rule**, so you don't have to repeat it per rule.

```ts
distCompress({
  fallback: {
    enabled: true,   // default true
    format: "webp",  // default "webp"
    options: { quality: 80 },
  },
});
```

- If a rule already outputs that format, it's not duplicated — only the `fallback: true` flag is added.
- Set `fallback: false` to disable it (in that case, the `<img src>` after HTML rewriting stays the original file unless a rule explicitly sets `fallback: true` on one of its outputs).

The output flagged `fallback: true` is used as the **final `<img src>`** when rewriting `<picture>` (and is excluded from the `<source>` list). Other outputs become `<source>` elements, ordered best-format-first (AVIF → WebP → …).

## HTML rewriting (automatic `<picture>` generation)

When `rewriteHtml: true` (the default), `dist`'s `**/*.html` files are scanned, and `<img>` tags referencing a converted image are rewritten like this:

```html
<!-- Before -->
<img src="/images/photo.png" alt="..." width="800" height="600" />

<!-- After (png with alpha, default rules) -->
<picture>
  <source srcset="/images/photo.webp" type="image/webp" />
  <img src="/images/photo.webp" alt="..." width="800" height="600" />
</picture>

<!-- After (png without alpha, default rules: avif + auto webp fallback) -->
<picture>
  <source srcset="/images/photo.avif" type="image/avif" />
  <source srcset="/images/photo.webp" type="image/webp" />
  <img src="/images/photo.webp" alt="..." width="800" height="600" />
</picture>
```

- Both root-absolute (`/images/...`) and relative `src` values are supported, and the rewritten path keeps the same style (absolute/relative) as the original.
- `<img>` tags with external URLs or `data:` URIs are skipped.
- `<img>` tags already inside a `<picture>` are skipped (prevents double rewriting).
- Set `rewriteHtml: false` to only generate files, leaving HTML untouched.

## Removing originals

```ts
distCompress({ removeOriginal: true });
```

Globally, or per rule (`rule.removeOriginal`), you can delete the original file — but only for images that have a fallback output (deleting without one would break references, so this is guarded intentionally for safety).

## Options

```ts
interface AstroDistCompressOptions {
  rules?: CompressRule[];              // default: PNG(alpha)→webp / PNG(opaque)→avif / JPEG→avif
  fallback?: FallbackConfig | false;   // default: { enabled: true, format: "webp" }
  rewriteHtml?: boolean;               // default: true
  removeOriginal?: boolean;            // default: false
  extensions?: string[];               // default: ["png", "jpg", "jpeg"]
  exclude?: string[];                  // exclude globs, relative to the dist root
  concurrency?: number;                // default: 4
  logger?: boolean;                    // default: true
  dryRun?: boolean;                    // default: false. Log only — no files written/removed, no HTML rewritten
  onError?: "skip" | "throw";          // default: "skip". Whether a single failed conversion aborts the whole build
  report?: string | false;             // default: false. Write a JSON summary of the run to this path
}
```

### `dryRun`

```ts
distCompress({ dryRun: true });
```

When enabled, no files are written or removed, and HTML is not rewritten. Sizes are still computed by encoding to memory, so the log and report show numbers (compressed size, savings) close to what a real run would produce. Use this to try out a configuration before letting it touch your build output.

### `onError`

```ts
distCompress({ onError: "skip" }); // default
```

- `"skip"` (default): logs a warning and continues with the rest of the images when one conversion fails. A single corrupt image won't take down the whole build.
- `"throw"`: throws on a failed conversion, failing the build. Useful in CI when you want to catch problems immediately.

### `report`

```ts
distCompress({ report: "dist-compress-report.json" });
```

Writes a JSON file after the build finishes, listing each converted image's outputs, sizes, and the HTML rewrite counts. Relative paths resolve against the current working directory (usually the project root). Useful for wiring into follow-up steps such as a CI size-regression check.

## Example

There's a minimal Astro project in `example/`.

```bash
npm run build          # build this package itself
cd example
npm install
npm run build           # astro build; the compression results are logged afterward
```

## How it works

1. The `astro:build:done` hook receives `dir` (the output directory) — this hook only fires on build.
2. `fast-glob` enumerates matching-extension images under `dist`, and `sharp` reads each one's format, transparency, and dimensions.
3. For each image, `rules` are evaluated top to bottom; the first match's `outputs` are converted and written with `sharp`.
4. If `rewriteHtml` is enabled, `dist`'s `*.html` files are scanned and matching `<img>` tags are rewritten into `<picture>`.
