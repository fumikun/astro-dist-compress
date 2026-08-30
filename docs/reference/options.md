# Options

```ts
distCompress(options?: AstroDistCompressOptions)
```

## `AstroDistCompressOptions`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rules` | `CompressRule[]` | [`defaultRules`](/guide/rules#not-using-the-defaults) | Ordered conversion rules. First match wins. |
| `fallback` | `FallbackConfig \| false` | `{ enabled: true, format: "webp" }` | Auto-adds a fallback output to every rule. See [Fallback images](/guide/fallback). |
| `rewriteHtml` | `boolean` | `true` | Rewrite `<img>` into `<picture>` in the build output's HTML. See [HTML rewriting](/guide/html-rewriting). |
| `removeOriginal` | `boolean` | `false` | Delete original files once a fallback output exists. See [Removing originals](/guide/removing-originals). |
| `extensions` | `string[]` | `["png", "jpg", "jpeg"]` | File extensions (without the dot) to scan for in the build output. |
| `exclude` | `string[]` | `[]` | Glob patterns, relative to the output root, to skip entirely. |
| `concurrency` | `number` | `4` | Number of images processed in parallel. |
| `logger` | `boolean` | `true` | Log progress and a bytes-saved summary via Astro's integration logger. |

## `CompressRule`

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string?` | Label used only in logs. |
| `match` | `(ctx: ImageContext) => boolean` | Decides whether the rule applies to a given image. |
| `outputs` | `OutputTarget[]` | Formats to produce for matched images. |
| `removeOriginal` | `boolean?` | Overrides the global `removeOriginal` for this rule. |

## `OutputTarget`

| Field | Type | Description |
| --- | --- | --- |
| `format` | `ImageFormat` | Target format: `"avif" \| "webp" \| "png" \| "jpeg" \| "jpg" \| "gif" \| "tiff"`. |
| `options` | `Record<string, unknown>?` | Passed straight through to sharp's `.toFormat(format, options)`. |
| `fallback` | `boolean?` | Marks this output as the one used for the final `<img src>`. |
| `sameFormatSuffix` | `string?` | Suffix used when the target format equals the source format, to avoid overwriting it. Default: `"-compressed"`. |
| `widths` | `number[]?` | Generate one width-resized variant per entry, wired up as a `srcset`. Widths larger than the source are dropped (no upscaling). See [Responsive images](/guide/responsive-images). |
| `sizes` | `string?` | `sizes` attribute emitted on the corresponding `<source>`/`<img>` when `widths` produces more than one variant. |

## `FallbackConfig`

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean?` | `true` | Whether to auto-add the fallback format to every rule. |
| `format` | `ImageFormat?` | `"webp"` | Format to auto-add. |
| `options` | `Record<string, unknown>?` | `{ quality: 80 }` | Encode options for the auto-added output. |

## `ImageContext`

Passed to every rule's `match` function — see [Rules](/guide/rules#imagecontext) for the full shape and field descriptions.
