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
}

export interface ConvertResult {
  source: ImageContext;
  rule: CompressRule;
  outputs: ConvertedOutput[];
  originalRemoved: boolean;
  sizeBefore: number;
  sizeAfter: number;
}

export async function convertImage(ctx: ImageContext, rule: CompressRule, removeOriginal: boolean): Promise<ConvertResult> {
  const outputs: ConvertedOutput[] = [];

  for (const target of rule.outputs) {
    const outPath = outputPathFor(ctx, target);
    const pipeline = sharp(ctx.absolutePath).toFormat(toSharpFormat(target.format), target.options);
    const info = await pipeline.toFile(outPath.absolutePath);
    outputs.push({
      absolutePath: outPath.absolutePath,
      relativePath: outPath.relativePath,
      format: target.format,
      fallback: target.fallback ?? false,
      size: info.size,
    });
  }

  const hasFallbackOutput = outputs.some((o) => o.fallback);
  const shouldRemoveOriginal = (rule.removeOriginal ?? removeOriginal) && hasFallbackOutput;

  let originalRemoved = false;
  if (shouldRemoveOriginal) {
    await rm(ctx.absolutePath);
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

function outputPathFor(ctx: ImageContext, target: OutputTarget): { absolutePath: string; relativePath: string } {
  const extension = target.format === "jpg" ? "jpeg" : target.format;
  const sameFormat = extension === ctx.format || (extension === "jpeg" && ctx.format === "jpg");
  const suffix = sameFormat ? target.sameFormatSuffix ?? "-compressed" : "";

  const baseWithoutExt = ctx.relativePath.slice(0, ctx.relativePath.length - ctx.extension.length - 1);
  const relativePath = `${baseWithoutExt}${suffix}.${extension}`;
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
