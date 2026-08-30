# Responsive images (`srcset`)

Add `widths` to an `OutputTarget` to generate several width-resized variants of that output and have them wired up as a `srcset` automatically, instead of a single fixed-size file.

```ts
interface OutputTarget {
  // ...
  widths?: number[];
  sizes?: string;
}
```

## Example

```ts
import { defineConfig } from "astro/config";
import distCompress, { hasFormat } from "astro-dist-compress";

export default defineConfig({
  integrations: [
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
    }),
  ],
});
```

```html
<!-- Before -->
<img src="/images/photo.jpg" alt="…" />

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
    alt="…"
  />
</picture>
```

Each requested width gets its own file, named with a `-{width}w` suffix before the extension (`photo-320w.avif`, `photo-640w.avif`, …).

## Behaviour

- **No upscaling.** Widths larger than the source image's own width are dropped. If every requested width exceeds the source width, a single output at the source's own width is produced instead — you always get at least one file, never a blown-up one.
- **Grouping.** All variants generated from the same `OutputTarget` are grouped back into one `<source>` (or, for the `fallback`-flagged target, one `<img>`), sorted ascending by width, as a single `w`-descriptor `srcset`.
- **`sizes`.** When a target's `widths` produce more than one variant, its `sizes` string (if set) is copied onto the corresponding `<source>`/`<img>`. It's omitted entirely if the target only produced a single file (nothing to size between) or if `sizes` wasn't set.
- **Fallback `<img>`.** When the `fallback`-flagged output itself has `widths`, the `<img src>` points at the *largest* variant (for browsers/crawlers that ignore `srcset`), while `srcset`/`sizes` are also set on the `<img>` itself.
- **Opt-in, per output.** Targets without `widths` behave exactly as before — a single, unsuffixed file with no `srcset`. You can mix responsive and non-responsive outputs freely across a rule's `outputs`.

## When to skip this

If your images are already a fixed display size (icons, logos, fixed-width diagrams), plain `outputs` without `widths` is simpler and avoids generating files you won't use.
