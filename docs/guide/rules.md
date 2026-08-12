# Rules: directory & image state

`rules` is an ordered list of `CompressRule`. For each image found in the build output, rules are tried **top to bottom** and the **first match wins**. Images that match no rule are left untouched.

```ts
interface CompressRule {
  name?: string;
  match: (ctx: ImageContext) => boolean;
  outputs: OutputTarget[];
  removeOriginal?: boolean;
}
```

## `ImageContext`

`match` receives everything the plugin knows about an image at scan time:

```ts
interface ImageContext {
  relativePath: string; // "assets/hero/photo.png"
  absolutePath: string;
  dir: string;           // "assets/hero"
  fileName: string;      // "photo.png"
  extension: string;     // "png"
  format: ImageFormat;   // "png" | "jpeg" | "webp" | "avif" | ...
  hasAlpha: boolean;
  width: number;
  height: number;
  size: number;          // bytes, on disk
}
```

`hasAlpha`, `width`/`height` and `format` are read directly from the image bytes with `sharp`, not guessed from the file extension.

## Built-in matchers

Instead of writing raw predicates every time, `astro-dist-compress` exports composable matcher helpers:

| Function | Matches when… |
| --- | --- |
| `inDir(...globs)` | the image lives under one of the given directory globs (`"assets/hero"` matches everything below it) |
| `pathMatches(...globs)` | the full relative path matches one of the given globs (e.g. `"**/icons/*.png"`) |
| `hasFormat(...formats)` | the source format is one of the given formats |
| `hasAlpha(expected?)` | the image does (or, with `false`, does not) have an alpha channel |
| `largerThan({ width?, height? })` | the image is at least this many pixels wide/tall |
| `biggerThan(bytes)` | the file is at least this many bytes on disk |
| `and(...matchers)` / `or(...matchers)` / `not(matcher)` | combine matchers |

You can always drop down to a plain function — `match: (ctx) => ctx.dir.startsWith("assets/marketing")` works exactly the same way.

## Example: mixing directory and image-state rules

```ts
import { defineConfig } from "astro/config";
import distCompress, { and, hasAlpha, hasFormat, inDir, biggerThan } from "astro-dist-compress";

export default defineConfig({
  integrations: [
    distCompress({
      rules: [
        // Everything under assets/hero gets a more aggressive AVIF pass,
        // regardless of transparency.
        {
          name: "hero images -> aggressive avif",
          match: inDir("assets/hero"),
          outputs: [{ format: "avif", options: { quality: 40 } }],
        },

        // Only convert large transparent PNGs — leave small icons alone.
        {
          name: "large png-with-alpha -> webp",
          match: and(hasFormat("png"), hasAlpha(true), biggerThan(20_000)),
          outputs: [{ format: "webp", options: { quality: 82 }, fallback: true }],
        },

        // Default behaviour for everything else.
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
    }),
  ],
});
```

Rule order matters: the hero rule above is listed first specifically so it takes priority over the general PNG rules for images under `assets/hero`.

## `outputs`

Each rule can produce **multiple** output files:

```ts
interface OutputTarget {
  format: ImageFormat;
  options?: Record<string, unknown>; // passed straight to sharp's .toFormat()
  fallback?: boolean;
  sameFormatSuffix?: string; // default "-compressed"
}
```

- `options` is forwarded verbatim to sharp's encoder (`quality`, `effort`, `lossless`, …).
- `fallback: true` marks the output used as the final `<img src>` when [HTML rewriting](/guide/html-rewriting) is enabled. Exactly one output per rule should set this.
- If a target format matches the source format (rare, but possible with custom rules), the file is written with a suffix (default `-compressed`) so the original is never silently overwritten.

## Not using the defaults

If you supply your own `rules`, the built-in defaults are replaced entirely — they aren't merged. Re-export `defaultRules` if you want to extend rather than replace them:

```ts
import distCompress, { defaultRules, inDir } from "astro-dist-compress";

distCompress({
  rules: [
    { name: "hero -> avif", match: inDir("assets/hero"), outputs: [{ format: "avif" }] },
    ...defaultRules,
  ],
});
```
