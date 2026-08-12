# Removing originals

By default, `astro-dist-compress` **keeps** the original source file next to the files it generates — the build output only grows.

```ts
distCompress({ removeOriginal: true });
```

Setting this globally (or per-rule, via `CompressRule.removeOriginal`, which takes priority) deletes the original once its outputs exist — but **only for images whose rule produced a `fallback: true` output**. This guard exists on purpose: deleting the only remaining reference to an image whose HTML wasn't rewritten (or that a rule left with no fallback) would leave a broken `<img src>` behind.

## When originals are actually removed

| `rewriteHtml` | rule has `fallback: true` output | original removed? |
| --- | --- | --- |
| `true` (default) | yes | ✅ — HTML is repointed at the fallback output before/around removal |
| `true` | no | ❌ — nothing to point `<img src>` at instead |
| `false` | yes | ✅ — the fallback file exists on disk, you're responsible for referencing it |
| `false` | no | ❌ |

In practice: as long as [fallback generation](/guide/fallback) is enabled (the default), every rule ends up with a `fallback: true` output, so `removeOriginal: true` behaves as "keep only the converted formats" project-wide.

## Per-rule override

```ts
rules: [
  {
    name: "hero -> avif (drop original)",
    match: inDir("assets/hero"),
    outputs: [{ format: "avif", fallback: true }],
    removeOriginal: true,
  },
  {
    name: "everything else, keep originals",
    match: hasFormat("png", "jpeg", "jpg"),
    outputs: [{ format: "webp", fallback: true }],
    removeOriginal: false,
  },
],
```
