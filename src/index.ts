import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { convertImage, type ConvertResult } from "./convert.js";
import { rewriteHtml } from "./html.js";
import { runPool } from "./pool.js";
import { resolveOptions } from "./resolve.js";
import { findImages } from "./scan.js";
import type { AstroDistCompressOptions, CompressRule, ImageContext } from "./types.js";

export type {
  AstroDistCompressOptions,
  CompressRule,
  EncodeOptions,
  FallbackConfig,
  ImageContext,
  ImageFormat,
  OutputTarget,
} from "./types.js";
export * from "./matchers.js";
export { defaultRules } from "./defaults.js";

export default function distCompress(options: AstroDistCompressOptions = {}): AstroIntegration {
  const resolved = resolveOptions(options);

  return {
    name: "astro-dist-compress",
    hooks: {
      // This hook only fires for `astro build`, never for `astro dev` — so
      // there's nothing to do to keep dev untouched.
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir).replace(/[\\/]+$/, "");
        const log = resolved.logger ? logger : { info: () => {}, warn: () => {}, error: () => {} };

        const images = await findImages(root, resolved.extensions, resolved.exclude);
        if (images.length === 0) {
          log.info("no matching images found, nothing to do.");
          return;
        }

        const matched: Array<{ ctx: ImageContext; rule: CompressRule }> = [];
        for (const ctx of images) {
          const rule = resolved.rules.find((r) => r.match(ctx));
          if (rule) matched.push({ ctx, rule });
        }

        log.info(`compressing ${matched.length}/${images.length} image(s)...`);

        const results = await runPool(matched, resolved.concurrency, ({ ctx, rule }) =>
          convertImage(ctx, rule, resolved.removeOriginal),
        );

        logSummary(log, results);

        if (resolved.rewriteHtml) {
          const { filesChanged, imagesRewritten } = await rewriteHtml(root, results);
          log.info(`rewrote ${imagesRewritten} <img> tag(s) into <picture> across ${filesChanged} html file(s).`);
        }
      },
    },
  };
}

function logSummary(log: { info: (msg: string) => void }, results: ConvertResult[]): void {
  if (results.length === 0) return;
  const before = results.reduce((sum, r) => sum + r.sizeBefore, 0);
  const after = results.reduce((sum, r) => sum + r.sizeAfter, 0);
  const savedPct = before === 0 ? 0 : (1 - after / before) * 100;
  log.info(
    `done: ${formatBytes(before)} -> ${formatBytes(after)} (${savedPct >= 0 ? "-" : "+"}${Math.abs(savedPct).toFixed(1)}%)`,
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
