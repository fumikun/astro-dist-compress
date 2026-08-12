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

function buildPicture(
  img: HTMLElement,
  htmlRelativePath: string,
  result: ConvertResult,
  rootAbsolute: boolean,
): HTMLElement {
  const htmlDir = dirname(htmlRelativePath);
  const fallbackOutput = result.outputs.find((o) => o.fallback);
  const sourceOutputs = result.outputs
    .filter((o) => o !== fallbackOutput)
    .sort((a, b) => FORMAT_PRIORITY.indexOf(a.format) - FORMAT_PRIORITY.indexOf(b.format));

  const picture = new HTMLElement("picture", {});

  for (const output of sourceOutputs) {
    const source = new HTMLElement("source", {});
    source.setAttribute("srcset", toHref(htmlDir, output.relativePath, rootAbsolute));
    source.setAttribute("type", MIME_TYPES[output.format]);
    picture.appendChild(source);
  }

  const fallbackImg = img.clone() as HTMLElement;
  const fallbackRelativePath = fallbackOutput
    ? fallbackOutput.relativePath
    : result.originalRemoved
      ? sourceOutputs[0]?.relativePath
      : undefined;
  const fallbackHref = fallbackRelativePath
    ? toHref(htmlDir, fallbackRelativePath, rootAbsolute)
    : img.getAttribute("src")!;
  fallbackImg.setAttribute("src", fallbackHref);
  picture.appendChild(fallbackImg);

  return picture;
}

function toHref(htmlDir: string, relativePath: string, rootAbsolute: boolean): string {
  if (rootAbsolute) return `/${relativePath}`;
  const href = htmlDir === "." ? relativePath : posixRelative(htmlDir, relativePath);
  return href.startsWith(".") ? href : `./${href}`;
}
