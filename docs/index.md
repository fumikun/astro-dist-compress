---
layout: home

hero:
  name: astro-dist-compress
  text: Compress your Astro build output
  tagline: Per-directory and per-image-state compression rules in TypeScript, with automatic fallback generation and HTML rewriting.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Rules
      link: /guide/rules

features:
  - icon: 🛠️
    title: TypeScript rules
    text: Match images by directory, source format, alpha channel, dimensions, or file size — and combine matchers with and/or/not.
  - icon: 📦
    title: Build-only
    text: Runs on the astro:build:done hook. Nothing happens during astro dev — no extra guards needed.
  - icon: 🖼️
    title: Smart defaults
    text: PNG with transparency becomes WebP, opaque PNG and JPEG become AVIF, out of the box.
  - icon: 🔁
    title: Automatic fallback
    text: Declare a fallback format once and every rule gets it, without repeating it per rule.
  - icon: 🧩
    title: Picture rewriting
    text: "<img> tags referencing converted images are rewritten into <picture> with <source> elements automatically."
  - icon: 🗑️
    title: Optional cleanup
    text: Keep originals as a safety net, or remove them once a fallback exists.
---
