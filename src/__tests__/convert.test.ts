import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { convertImage } from "../convert.js";
import type { CompressRule, ImageContext } from "../types.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "astro-dist-compress-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

async function makeSourceImage(relativePath: string, width: number, height: number): Promise<ImageContext> {
  const absolutePath = join(root, relativePath);
  await sharp({ create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .png()
    .toFile(absolutePath);
  const { size } = await stat(absolutePath);

  return {
    relativePath,
    absolutePath,
    dir: "",
    fileName: relativePath,
    extension: "png",
    format: "png",
    hasAlpha: false,
    width,
    height,
    size,
  };
}

describe("convertImage widths", () => {
  it("produces one unsuffixed output when the target has no widths", async () => {
    const ctx = await makeSourceImage("photo.png", 800, 600);
    const rule: CompressRule = { match: () => true, outputs: [{ format: "webp" }] };

    const result = await convertImage(ctx, rule, false);

    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]!.relativePath).toBe("photo.webp");
    expect(result.outputs[0]!.width).toBeUndefined();
    expect(result.outputs[0]!.targetIndex).toBe(0);
  });

  it("generates a width-suffixed variant per requested width, capped to the source width", async () => {
    const ctx = await makeSourceImage("photo.png", 800, 600);
    const rule: CompressRule = {
      match: () => true,
      outputs: [{ format: "webp", widths: [320, 640, 1600], sizes: "100vw" }],
    };

    const result = await convertImage(ctx, rule, false);

    // 1600 exceeds the 800px source width, so it's dropped instead of upscaling.
    expect(result.outputs.map((o) => o.width)).toEqual([320, 640]);
    expect(result.outputs.map((o) => o.relativePath)).toEqual(["photo-320w.webp", "photo-640w.webp"]);
    expect(result.outputs.every((o) => o.targetIndex === 0)).toBe(true);
    expect(result.outputs.every((o) => o.sizes === "100vw")).toBe(true);

    const meta320 = await sharp(result.outputs[0]!.absolutePath).metadata();
    const meta640 = await sharp(result.outputs[1]!.absolutePath).metadata();
    expect(meta320.width).toBe(320);
    expect(meta640.width).toBe(640);
  });

  it("falls back to a single output at the source width when every requested width exceeds it", async () => {
    const ctx = await makeSourceImage("photo.png", 400, 300);
    const rule: CompressRule = {
      match: () => true,
      outputs: [{ format: "webp", widths: [800, 1600] }],
    };

    const result = await convertImage(ctx, rule, false);

    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]!.width).toBe(400);
    expect(result.outputs[0]!.relativePath).toBe("photo-400w.webp");
  });

  it("assigns distinct targetIndex values across multiple outputs on the same rule", async () => {
    const ctx = await makeSourceImage("photo.png", 800, 600);
    const rule: CompressRule = {
      match: () => true,
      outputs: [
        { format: "avif", widths: [320, 640] },
        { format: "webp", fallback: true },
      ],
    };

    const result = await convertImage(ctx, rule, false);

    const avifOutputs = result.outputs.filter((o) => o.format === "avif");
    const webpOutputs = result.outputs.filter((o) => o.format === "webp");
    expect(avifOutputs.every((o) => o.targetIndex === 0)).toBe(true);
    expect(webpOutputs.every((o) => o.targetIndex === 1)).toBe(true);
  });
});

describe("convertImage dryRun", () => {
  it("reports realistic sizes without writing output files or removing the original", async () => {
    const ctx = await makeSourceImage("photo.png", 800, 600);
    const rule: CompressRule = {
      match: () => true,
      outputs: [{ format: "webp", widths: [320, 640], fallback: true }],
    };

    const result = await convertImage(ctx, rule, true, true);

    expect(result.outputs).toHaveLength(2);
    expect(result.outputs.every((o) => o.size > 0)).toBe(true);
    expect(result.originalRemoved).toBe(true); // reflects what *would* happen, for reporting

    for (const output of result.outputs) {
      await expect(stat(output.absolutePath)).rejects.toThrow();
    }
    await expect(stat(ctx.absolutePath)).resolves.toBeDefined();
  });
});
