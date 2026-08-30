import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ConvertResult, ConvertedOutput } from "../convert.js";
import { rewriteHtml } from "../html.js";
import type { CompressRule, ImageContext } from "../types.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "astro-dist-compress-html-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function sourceCtx(): ImageContext {
  return {
    relativePath: "photo.png",
    absolutePath: join(root, "photo.png"),
    dir: "",
    fileName: "photo.png",
    extension: "png",
    format: "png",
    hasAlpha: false,
    width: 800,
    height: 600,
    size: 10_000,
  };
}

function output(overrides: Partial<ConvertedOutput>): ConvertedOutput {
  return {
    absolutePath: join(root, overrides.relativePath ?? "photo.webp"),
    relativePath: "photo.webp",
    format: "webp",
    fallback: false,
    size: 1000,
    targetIndex: 0,
    ...overrides,
  };
}

async function writeHtmlAndRewrite(html: string, outputs: ConvertedOutput[], dryRun = false): Promise<string> {
  await writeFile(join(root, "index.html"), html, "utf-8");
  const rule: CompressRule = { match: () => true, outputs: [] };
  const result: ConvertResult = {
    source: sourceCtx(),
    rule,
    outputs,
    originalRemoved: false,
    sizeBefore: 10_000,
    sizeAfter: 1000,
  };
  await rewriteHtml(root, [result], dryRun);
  return readFile(join(root, "index.html"), "utf-8");
}

describe("rewriteHtml responsive srcset", () => {
  it("emits a single-path srcset for a non-responsive output", async () => {
    const html = await writeHtmlAndRewrite(`<img src="/photo.png" alt="x" />`, [
      output({ relativePath: "photo.webp", fallback: true, targetIndex: 0 }),
    ]);

    expect(html).toContain('<img src="/photo.webp"');
    expect(html).not.toContain("srcset");
  });

  it("groups width variants of the same target into one srcset with w-descriptors", async () => {
    const html = await writeHtmlAndRewrite(`<img src="/photo.png" alt="x" />`, [
      output({ relativePath: "photo-320w.avif", format: "avif", width: 320, targetIndex: 0, sizes: "100vw" }),
      output({ relativePath: "photo-640w.avif", format: "avif", width: 640, targetIndex: 0, sizes: "100vw" }),
      output({ relativePath: "photo.webp", fallback: true, targetIndex: 1 }),
    ]);

    expect(html).toContain(
      '<source srcset="/photo-320w.avif 320w, /photo-640w.avif 640w" type="image/avif" sizes="100vw">',
    );
    expect(html).toContain('<img src="/photo.webp"');
  });

  it("sets img src/srcset/sizes from the fallback target's own width variants", async () => {
    const html = await writeHtmlAndRewrite(`<img src="/photo.png" alt="x" />`, [
      output({
        relativePath: "photo-320w.webp",
        width: 320,
        fallback: true,
        targetIndex: 0,
        sizes: "50vw",
      }),
      output({
        relativePath: "photo-640w.webp",
        width: 640,
        fallback: true,
        targetIndex: 0,
        sizes: "50vw",
      }),
    ]);

    expect(html).toContain('src="/photo-640w.webp"');
    expect(html).toContain('srcset="/photo-320w.webp 320w, /photo-640w.webp 640w"');
    expect(html).toContain('sizes="50vw"');
  });

  it("leaves the HTML file untouched when dryRun is set", async () => {
    const original = `<img src="/photo.png" alt="x" />`;
    const html = await writeHtmlAndRewrite(
      original,
      [output({ relativePath: "photo.webp", fallback: true, targetIndex: 0 })],
      true,
    );

    expect(html).toBe(original);
  });
});
