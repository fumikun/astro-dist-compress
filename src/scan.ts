import { stat } from "node:fs/promises";
import { dirname, extname, basename } from "node:path";
import fg from "fast-glob";
import sharp from "sharp";
import type { ImageContext, ImageFormat } from "./types.js";

const KNOWN_FORMATS = new Set<ImageFormat>(["avif", "webp", "png", "jpeg", "jpg", "gif", "tiff"]);

export async function findImages(
  root: string,
  extensions: string[],
  exclude: string[],
): Promise<ImageContext[]> {
  const patterns = extensions.map((ext) => `**/*.${ext}`);
  const relativePaths = await fg(patterns, {
    cwd: root,
    onlyFiles: true,
    caseSensitiveMatch: false,
    ignore: exclude,
  });

  const contexts: ImageContext[] = [];
  for (const relativePath of relativePaths) {
    const ctx = await readImageContext(root, relativePath);
    if (ctx) contexts.push(ctx);
  }
  return contexts;
}

async function readImageContext(root: string, relativePath: string): Promise<ImageContext | null> {
  const absolutePath = `${root}/${relativePath}`;
  const [fileStat, metadata] = await Promise.all([stat(absolutePath), sharp(absolutePath).metadata()]);

  const format = normalizeFormat(metadata.format, relativePath);
  if (!format) return null;

  return {
    relativePath,
    absolutePath,
    dir: dirname(relativePath) === "." ? "" : dirname(relativePath).replace(/\\/g, "/"),
    fileName: basename(relativePath),
    extension: extname(relativePath).replace(/^\./, "").toLowerCase(),
    format,
    hasAlpha: metadata.hasAlpha ?? false,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    size: fileStat.size,
  };
}

function normalizeFormat(sharpFormat: string | undefined, relativePath: string): ImageFormat | null {
  const candidate = (sharpFormat ?? extname(relativePath).replace(/^\./, "")).toLowerCase();
  return KNOWN_FORMATS.has(candidate as ImageFormat) ? (candidate as ImageFormat) : null;
}
