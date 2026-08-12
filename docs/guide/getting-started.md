# Getting Started

`astro-dist-compress` is an Astro integration that compresses and converts images **in the build output (`dist/`)**. Unlike [`astro-compress`](https://github.com/astro-community/astro-compress), it lets you define conversion rules per **directory** and per **image state** (format, transparency, size) directly in TypeScript, and it can generate fallback images and rewrite HTML for you.

## Install

::: code-group

```sh [npm]
npm install astro-dist-compress
```

```sh [pnpm]
pnpm add astro-dist-compress
```

```sh [yarn]
yarn add astro-dist-compress
```

:::

## Add the integration

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import distCompress from "astro-dist-compress";

export default defineConfig({
  integrations: [distCompress()],
});
```

That's it. With no options, the default rules apply:

- PNG **with** transparency → **WebP**
- PNG **without** transparency → **AVIF**
- JPEG → **AVIF**
- Every rule above also gets a **WebP fallback** generated automatically (skipped where WebP is already the output)
- `<img>` tags in the built HTML are rewritten into `<picture>` elements pointing at the new files
- Original files are kept on disk by default

## Build-only, by design

The integration hooks into `astro:build:done`, which Astro only calls for `astro build` — never for `astro dev`. There's no dev/build branching to write or misconfigure; running `astro dev` simply never touches this code path.

```sh
astro build
```

```txt
[astro-dist-compress] compressing 12/14 image(s)...
[astro-dist-compress] done: 4.8 MB -> 1.6 MB (-66.7%)
[astro-dist-compress] rewrote 9 <img> tag(s) into <picture> across 5 html file(s).
```

## Next steps

- [Rules: directory & image state](/guide/rules) — write your own conversion rules
- [Fallback images](/guide/fallback) — how automatic fallback generation works
- [HTML rewriting](/guide/html-rewriting) — what the `<picture>` output looks like
- [Options reference](/reference/options) — every configuration option
