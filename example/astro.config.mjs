import { defineConfig } from "astro/config";
import distCompress, { and, hasAlpha, hasFormat, inDir } from "astro-dist-compress";

export default defineConfig({
  integrations: [
    distCompress({
      rules: [
        // Everything under /images/hero uses more aggressive avif regardless of alpha.
        {
          name: "hero -> avif (aggressive)",
          match: inDir("images/hero"),
          outputs: [{ format: "avif", options: { quality: 40 } }],
        },
        {
          name: "png-with-alpha -> webp",
          match: and(hasFormat("png"), hasAlpha(true)),
          outputs: [{ format: "webp", options: { quality: 80 }, fallback: true }],
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
