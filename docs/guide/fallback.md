# Fallback images

Modern formats like AVIF aren't supported everywhere. `astro-dist-compress` can generate a fallback image — WebP by default — for **every** rule automatically, so you don't have to repeat it in each rule's `outputs`.

## The `fallback` option

```ts
distCompress({
  fallback: {
    enabled: true,   // default: true
    format: "webp",  // default: "webp"
    options: { quality: 80 },
  },
});
```

When enabled, every rule is checked after matching:

- If the rule **doesn't already** produce the fallback format, an extra output is appended (`{ format, options, fallback: true }`).
- If the rule **already** produces that format, nothing is duplicated — the existing output is just flagged as the fallback (`fallback: true`) if no output was already flagged.

This is what makes "generate a WebP fallback for everything" a single, global setting instead of boilerplate on every rule.

### Example

```ts
rules: [
  {
    match: hasFormat("png"),
    outputs: [{ format: "avif", options: { quality: 55 } }],
  },
],
fallback: { enabled: true, format: "webp" },
```

resolves to:

```ts
outputs: [
  { format: "avif", options: { quality: 55 } },
  { format: "webp", options: { quality: 80 }, fallback: true }, // auto-added
]
```

## Disabling it

```ts
distCompress({ fallback: false });
```

With fallback generation off, the `<img src>` in the [rewritten HTML](/guide/html-rewriting) falls back to the **original source file** for any rule that doesn't explicitly mark one of its own outputs with `fallback: true`.

## Marking your own fallback

You don't need the global `fallback` option at all if a rule already knows what its fallback should be — just set `fallback: true` on one of its outputs:

```ts
{
  match: and(hasFormat("png"), hasAlpha(true)),
  outputs: [
    { format: "webp", options: { quality: 80 }, fallback: true },
  ],
}
```

Here WebP *is* the primary output and the fallback — there's nothing else to add, so the global fallback config (if the format matches) won't touch this rule.

## What the fallback is used for

The output flagged `fallback: true` becomes:

- The `<img src>` of the rewritten `<picture>` element (see [HTML rewriting](/guide/html-rewriting)).
- The file that's safe to point browsers at when none of the `<source>` formats are supported.

It is **not** included in the `<source>` list — only in the final `<img>`.
