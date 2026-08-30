import { rm, stat } from "node:fs/promises";
import sharp from "sharp";
import type { CompressRule, ImageContext, OutputTarget } from "./types.js";

export interface ConvertedOutput {
  /** Absolute path of the generated file. */
  absolutePath: string;
  /** Path relative to the dist root, "/"-separated. */
  relativePath: string;
  format: OutputTarget["format"];
  fallback: boolean;
  size: number;
  /** Index of the `OutputTarget` (within the matched rule's `outputs`) this variant was generated from. Used to group width variants of the same target back together. */
  targetIndex: number;
  /** Pixel width this variant was resized to, when the target set `widths`. Undefined for non-responsive outputs. */
  width?: number;
  /** `sizes` attribute copied from the originating `OutputTarget`, when set. */
  sizes?: string;
}

export interface ConvertResult {
  source: ImageContext;
  rule: CompressRule;
  outputs: ConvertedOutput[];
  originalRemoved: boolean;
  sizeBefore: number;
  sizeAfter: number;
}

export async function convertImage(
  ctx: ImageContext,
  rule: CompressRule,
  removeOriginal: boolean,
  dryRun = false,
): Promise<ConvertResult> {
  const outputs: ConvertedOutput[] = [];

  for (const [targetIndex, target] of rule.outputs.entries()) {
    const widths = resolveWidths(target, ctx);

    for (const width of widths) {
      const outPath = outputPathFor(ctx, target, width);
      let pipeline = sharp(ctx.absolutePath);
      if (width !== undefined) pipeline = pipeline.resize({ width });
      pipeline = pipeline.toFormat(toSharpFormat(target.format), target.options);

      // In dry-run mode, encode to memory to get an accurate size for the
      // summary/report without writing anything to disk.
      const size = dryRun ? (await pipeline.toBuffer()).length : (await pipeline.toFile(outPath.absolutePath)).size;

      outputs.push({
        absolutePath: outPath.absolutePath,
        relativePath: outPath.relativePath,
        format: target.format,
        fallback: target.fallback ?? false,
        size,
        targetIndex,
        width,
        sizes: target.sizes,
      });
    }
  }

  const hasFallbackOutput = outputs.some((o) => o.fallback);
  const shouldRemoveOriginal = (rule.removeOriginal ?? removeOriginal) && hasFallbackOutput;

  let originalRemoved = false;
  if (shouldRemoveOriginal && !dryRun) {
    await rm(ctx.absolutePath);
    originalRemoved = true;
  } else if (shouldRemoveOriginal) {
    originalRemoved = true;
  }

  const sizeAfter = outputs.reduce((sum, o) => sum + o.size, 0) + (originalRemoved ? 0 : ctx.size);

  return {
    source: ctx,
    rule,
    outputs,
    originalRemoved,
    sizeBefore: ctx.size,
    sizeAfter,
  };
}

/**
 * Widths to render for a target, deduped/sorted ascending and capped to the
 * source's own width (no upscaling). Returns `[undefined]` when the target
 * doesn't request responsive widths at all, meaning a single, unsuffixed
 * output should be produced (existing, non-responsive behaviour).
 */
function resolveWidths(target: OutputTarget, ctx: ImageContext): Array<number | undefined> {
  if (!target.widths || target.widths.length === 0) return [undefined];

  const capped = Array.from(new Set(target.widths))
    .filter((w) => w <= ctx.width)
    .sort((a, b) => a - b);

  return capped.length > 0 ? capped : [ctx.width];
}

function outputPathFor(
  ctx: ImageContext,
  target: OutputTarget,
  width?: number,
): { absolutePath: string; relativePath: string } {
  const extension = target.format === "jpg" ? "jpeg" : target.format;
  const sameFormat = extension === ctx.format || (extension === "jpeg" && ctx.format === "jpg");
  const suffix = sameFormat ? target.sameFormatSuffix ?? "-compressed" : "";
  const widthSuffix = width !== undefined ? `-${width}w` : "";

  const baseWithoutExt = ctx.relativePath.slice(0, ctx.relativePath.length - ctx.extension.length - 1);
  const relativePath = `${baseWithoutExt}${suffix}${widthSuffix}.${extension}`;
  const root = ctx.absolutePath.slice(0, ctx.absolutePath.length - ctx.relativePath.length);

  return { relativePath, absolutePath: `${root}${relativePath}` };
}

function toSharpFormat(format: OutputTarget["format"]): keyof sharp.FormatEnum {
  return format === "jpg" ? "jpeg" : format;
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
