import { readFile, writeFile } from "node:fs/promises";
import { dirname, join as posixJoin, normalize as posixNormalize, relative as posixRelative } from "node:path/posix";
import fg from "fast-glob";
import { parse, HTMLElement } from "node-html-parser";
import type { ConvertResult } from "./convert.js";
import type { ImageFormat } from "./types.js";

// Best-supported-first; controls <source> ordering (browsers use the first matching one).
const FORMAT_PRIORITY: ImageFormat[] = ["avif", "webp", "jpeg", "jpg", "png", "gif", "tiff"];

const MIME_TYPES: Record<ImageFormat, string> = {
  avif: "image/avif",
  webp: "image/webp",
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  gif: "image/gif",
  tiff: "image/tiff",
};

export interface HtmlRewriteSummary {
  filesChanged: number;
  imagesRewritten: number;
}

export async function rewriteHtml(root: string, results: ConvertResult[]): Promise<HtmlRewriteSummary> {
  const byRelativePath = new Map(results.map((r) => [r.source.relativePath, r]));
  if (byRelativePath.size === 0) return { filesChanged: 0, imagesRewritten: 0 };

  const htmlFiles = await fg("**/*.html", { cwd: root, onlyFiles: true });

  let filesChanged = 0;
  let imagesRewritten = 0;

  for (const htmlRelativePath of htmlFiles) {
    const absolutePath = posixJoin(root, htmlRelativePath);
    const html = await readFile(absolutePath, "utf-8");
    const dom = parse(html, { comment: true });

    let changedInFile = 0;
    for (const img of dom.querySelectorAll("img")) {
      // Never touch an <img> that's already inside a <picture> we (or the author) placed.
      if (img.closest("picture")) continue;

      const src = img.getAttribute("src");
      if (!src) continue;

      const resolved = resolveImageSrc(htmlRelativePath, src);
      if (!resolved) continue;

      const result = byRelativePath.get(resolved);
      if (!result) continue;

      const isRootAbsolute = src.split("#")[0]!.split("?")[0]!.startsWith("/");
      const picture = buildPicture(img, htmlRelativePath, result, isRootAbsolute);
      img.replaceWith(picture);
      changedInFile++;
    }

    if (changedInFile > 0) {
      await writeFile(absolutePath, dom.toString(), "utf-8");
      filesChanged++;
      imagesRewritten += changedInFile;
    }
  }

  return { filesChanged, imagesRewritten };
}

function resolveImageSrc(htmlRelativePath: string, src: string): string | null {
  const withoutQuery = src.split("#")[0]!.split("?")[0]!;
  if (withoutQuery === "") return null;
  if (/^([a-z]+:)?\/\//i.test(withoutQuery) || withoutQuery.startsWith("data:")) return null; // external / data URI

  if (withoutQuery.startsWith("/")) {
    return posixNormalize(withoutQuery.slice(1));
  }

  return posixNormalize(posixJoin(dirname(htmlRelativePath), withoutQuery));
}

/** One `OutputTarget`'s generated files, grouped back together (its width variants, if any). */
interface OutputGroup {
  format: ImageFormat;
  fallback: boolean;
  sizes?: string;
  /** Ascending by width; a single entry with `width: undefined` for non-responsive targets. */
  variants: ConvertResult["outputs"];
}

function groupOutputs(outputs: ConvertResult["outputs"]): OutputGroup[] {
  const byTarget = new Map<number, OutputGroup>();
  for (const output of outputs) {
    let group = byTarget.get(output.targetIndex);
    if (!group) {
      group = { format: output.format, fallback: output.fallback, sizes: output.sizes, variants: [] };
      byTarget.set(output.targetIndex, group);
    }
    group.variants.push(output);
  }
  for (const group of byTarget.values()) {
    group.variants.sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  }
  return [...byTarget.values()];
}

/** Builds the `srcset` value for a group, using `path width` descriptors when the group has responsive variants. */
function srcsetFor(group: OutputGroup, htmlDir: string, rootAbsolute: boolean): string {
  return group.variants
    .map((variant) => {
      const href = toHref(htmlDir, variant.relativePath, rootAbsolute);
      return variant.width !== undefined ? `${href} ${variant.width}w` : href;
    })
    .join(", ");
}

function buildPicture(
  img: HTMLElement,
  htmlRelativePath: string,
  result: ConvertResult,
  rootAbsolute: boolean,
): HTMLElement {
  const htmlDir = dirname(htmlRelativePath);
  const groups = groupOutputs(result.outputs);
  const fallbackGroup = groups.find((g) => g.fallback);
  const sourceGroups = groups
    .filter((g) => g !== fallbackGroup)
    .sort((a, b) => FORMAT_PRIORITY.indexOf(a.format) - FORMAT_PRIORITY.indexOf(b.format));

  const picture = new HTMLElement("picture", {});

  for (const group of sourceGroups) {
    const source = new HTMLElement("source", {});
    source.setAttribute("srcset", srcsetFor(group, htmlDir, rootAbsolute));
    source.setAttribute("type", MIME_TYPES[group.format]);
    if (group.sizes && group.variants.length > 1) source.setAttribute("sizes", group.sizes);
    picture.appendChild(source);
  }

  const fallbackImg = img.clone() as HTMLElement;
  if (fallbackGroup) {
    const largest = fallbackGroup.variants[fallbackGroup.variants.length - 1]!;
    fallbackImg.setAttribute("src", toHref(htmlDir, largest.relativePath, rootAbsolute));
    if (fallbackGroup.variants.length > 1) {
      fallbackImg.setAttribute("srcset", srcsetFor(fallbackGroup, htmlDir, rootAbsolute));
      if (fallbackGroup.sizes) fallbackImg.setAttribute("sizes", fallbackGroup.sizes);
    }
  } else if (result.originalRemoved) {
    const first = sourceGroups[0]?.variants[0];
    if (first) fallbackImg.setAttribute("src", toHref(htmlDir, first.relativePath, rootAbsolute));
  }
  picture.appendChild(fallbackImg);

  return picture;
}

function toHref(htmlDir: string, relativePath: string, rootAbsolute: boolean): string {
  if (rootAbsolute) return `/${relativePath}`;
  const href = htmlDir === "." ? relativePath : posixRelative(htmlDir, relativePath);
  return href.startsWith(".") ? href : `./${href}`;
}
