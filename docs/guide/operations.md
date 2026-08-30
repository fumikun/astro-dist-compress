# Dry run, errors & reporting

Three options that don't change *what* gets converted, but how safely and observably a run happens.

## `dryRun`

```ts
distCompress({ dryRun: true });
```

Previews a run without touching the filesystem: no output files are written, no originals are removed, and HTML is not rewritten. Sizes are still computed — each candidate output is encoded to memory instead of disk — so the logged summary (and [`report`](#report), if enabled) show realistic before/after byte counts, as if the run had actually happened.

Every log line from a dry run is prefixed with `[dry run] ` so it's obvious from the build output that nothing was written.

Use this to check what a new rule set or `widths` config would produce before letting it touch your build output.

## `onError`

```ts
distCompress({ onError: "skip" }); // default
```

Controls what happens when converting a single image throws (a corrupt file, an encoder option sharp rejects, etc.):

- **`"skip"`** (default) — logs a warning naming the offending file and its error, then continues with the rest. One bad image doesn't take down an otherwise-successful build.
- **`"throw"`** — re-throws, failing the whole `astro build`. Use this in CI if you'd rather catch a bad image immediately than ship a build where it silently kept its original format.

Images that fail are excluded from the HTML rewrite and the `report` — they're left exactly as they were in the build output.

## `report`

```ts
distCompress({ report: "dist-compress-report.json" });
```

Writes a JSON summary once the build finishes. Relative paths resolve against the current working directory (typically your project root); parent directories are created as needed.

```jsonc
{
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "dryRun": false,
  "images": [
    {
      "source": "images/photo.jpg",
      "rule": "jpeg -> avif",
      "originalRemoved": false,
      "sizeBefore": 204800,
      "sizeAfter": 51200,
      "outputs": [
        { "relativePath": "images/photo.avif", "format": "avif", "fallback": false, "size": 40000 },
        { "relativePath": "images/photo.webp", "format": "webp", "fallback": true, "size": 11200 }
      ]
    }
  ],
  "summary": {
    "imagesProcessed": 1,
    "sizeBefore": 204800,
    "sizeAfter": 51200,
    "html": { "filesChanged": 1, "imagesRewritten": 1 }
  }
}
```

Pair this with `dryRun: true` to diff a proposed rule change's effect on total bytes before rolling it out, or read it in CI to fail a build that regresses total image weight beyond some threshold.
