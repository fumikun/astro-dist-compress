import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";
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

        const dryRunPrefix = resolved.dryRun ? "[dry run] " : "";
        log.info(`${dryRunPrefix}compressing ${matched.length}/${images.length} image(s)...`);

        const outcomes = await runPool(matched, resolved.concurrency, async ({ ctx, rule }) => {
          try {
            return await convertImage(ctx, rule, resolved.removeOriginal, resolved.dryRun);
          } catch (err) {
            if (resolved.onError === "throw") throw err;
            log.warn(`${dryRunPrefix}failed to convert ${ctx.relativePath}, skipping: ${errorMessage(err)}`);
            return null;
          }
        });
        const results = outcomes.filter((r): r is ConvertResult => r !== null);

        logSummary(log, results, dryRunPrefix);

        let htmlSummary = { filesChanged: 0, imagesRewritten: 0 };
        if (resolved.rewriteHtml) {
          htmlSummary = await rewriteHtml(root, results, resolved.dryRun);
          log.info(
            `${dryRunPrefix}rewrote ${htmlSummary.imagesRewritten} <img> tag(s) into <picture> across ${htmlSummary.filesChanged} html file(s).`,
          );
        }

        if (resolved.report) {
          await writeReport(resolved.report, results, htmlSummary, resolved.dryRun);
          log.info(`${dryRunPrefix}wrote report to ${resolved.report}`);
        }
      },
    },
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function writeReport(
  reportPath: string,
  results: ConvertResult[],
  htmlSummary: { filesChanged: number; imagesRewritten: number },
  dryRun: boolean,
): Promise<void> {
  const absolutePath = resolvePath(process.cwd(), reportPath);
  await mkdir(dirname(absolutePath), { recursive: true });

  const before = results.reduce((sum, r) => sum + r.sizeBefore, 0);
  const after = results.reduce((sum, r) => sum + r.sizeAfter, 0);

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    images: results.map((r) => ({
      source: r.source.relativePath,
      rule: r.rule.name,
      originalRemoved: r.originalRemoved,
      sizeBefore: r.sizeBefore,
      sizeAfter: r.sizeAfter,
      outputs: r.outputs.map((o) => ({
        relativePath: o.relativePath,
        format: o.format,
        width: o.width,
        fallback: o.fallback,
        size: o.size,
      })),
    })),
    summary: {
      imagesProcessed: results.length,
      sizeBefore: before,
      sizeAfter: after,
      html: htmlSummary,
    },
  };

  await writeFile(absolutePath, JSON.stringify(report, null, 2), "utf-8");
}

function logSummary(log: { info: (msg: string) => void }, results: ConvertResult[], prefix: string): void {
  if (results.length === 0) return;
  const before = results.reduce((sum, r) => sum + r.sizeBefore, 0);
  const after = results.reduce((sum, r) => sum + r.sizeAfter, 0);
  const savedPct = before === 0 ? 0 : (1 - after / before) * 100;
  log.info(
    `${prefix}done: ${formatBytes(before)} -> ${formatBytes(after)} (${savedPct >= 0 ? "-" : "+"}${Math.abs(savedPct).toFixed(1)}%)`,
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
