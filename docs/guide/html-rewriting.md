# HTML rewriting

When `rewriteHtml` is enabled (the default), `astro-dist-compress` scans every `**/*.html` file in the build output and rewrites `<img>` tags that reference a converted image into a `<picture>` element.

## Example

```html
<!-- Before -->
<img src="/images/photo.png" alt="…" width="800" height="600" />
```

With the default rules (opaque PNG → AVIF, plus an automatic WebP fallback):

```html
<!-- After -->
<picture>
  <source srcset="/images/photo.avif" type="image/avif" />
  <source srcset="/images/photo.webp" type="image/webp" />
  <img src="/images/photo.webp" alt="…" width="800" height="600" />
</picture>
```

The browser picks the first `<source>` it supports, in document order — so `<source>` elements are always emitted best-format-first (AVIF, then WebP, then anything else), and the format flagged `fallback: true` becomes the plain `<img src>` at the end.

If a rule produces only a single, fallback-flagged output (e.g. the default "PNG with alpha → WebP" rule), there's nothing to list as a `<source>`, so the `<img src>` is simply updated in place inside an (otherwise source-less) `<picture>`.

## Path handling

- Both root-absolute (`/images/photo.png`) and page-relative (`../images/photo.png`) `src` values are supported.
- The rewritten paths keep the **same style** as the original — absolute in, absolute out; relative in, relative out.
- External URLs (`https://…`, `//…`) and `data:` URIs are left untouched.
- An `<img>` that's already inside a `<picture>` (yours or a previous run's) is skipped, so re-running the build is safe.

## Disabling HTML rewriting

```ts
distCompress({ rewriteHtml: false });
```

With this off, converted image files are still written to disk — you're just responsible for referencing them yourself (for example, if you already hand-author `<picture>` elements, or generate HTML another way).

## Caveats

- Rewriting only looks at `<img src="…">`. It does not currently rewrite `srcset` on `<img>`, `background-image` in CSS, or inline `style` attributes.
- If your `astro.config` sets a non-default [`base`](https://docs.astro.build/en/reference/configuration-reference/#base), root-absolute `src` values in the HTML (`/my-app/images/photo.png`) include that base prefix, but files on disk under `dir` do not. Path resolution doesn't currently strip `base`, so matches will silently be skipped for such projects — the images are still converted and written to disk, only the HTML rewrite is affected. Use relative `src` values in these projects until `base`-aware matching is added.
