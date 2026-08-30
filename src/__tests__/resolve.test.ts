import { describe, expect, it } from "vitest";
import { resolveOptions } from "../resolve.js";
import type { CompressRule } from "../types.js";

describe("resolveOptions", () => {
  it("applies defaults when no options are given", () => {
    const resolved = resolveOptions();
    expect(resolved.rewriteHtml).toBe(true);
    expect(resolved.removeOriginal).toBe(false);
    expect(resolved.extensions).toEqual(["png", "jpg", "jpeg"]);
    expect(resolved.fallback).toEqual({ enabled: true, format: "webp", options: { quality: 80 } });
  });

  it("auto-adds the fallback format to rules that don't already produce it", () => {
    const rules: CompressRule[] = [
      { match: () => true, outputs: [{ format: "avif" }] },
    ];
    const resolved = resolveOptions({ rules });
    expect(resolved.rules[0]!.outputs).toEqual([
      { format: "avif" },
      { format: "webp", options: { quality: 80 }, fallback: true },
    ]);
  });

  it("does not duplicate the fallback format when a rule already outputs it", () => {
    const rules: CompressRule[] = [
      { match: () => true, outputs: [{ format: "webp", options: { quality: 90 }, fallback: true }] },
    ];
    const resolved = resolveOptions({ rules });
    expect(resolved.rules[0]!.outputs).toHaveLength(1);
    expect(resolved.rules[0]!.outputs[0]).toEqual({ format: "webp", options: { quality: 90 }, fallback: true });
  });

  it("marks an existing same-format output as the fallback if none was flagged", () => {
    const rules: CompressRule[] = [{ match: () => true, outputs: [{ format: "webp" }] }];
    const resolved = resolveOptions({ rules });
    expect(resolved.rules[0]!.outputs).toEqual([{ format: "webp", fallback: true }]);
  });

  it("skips fallback injection entirely when fallback is false", () => {
    const rules: CompressRule[] = [{ match: () => true, outputs: [{ format: "avif" }] }];
    const resolved = resolveOptions({ rules, fallback: false });
    expect(resolved.fallback).toBe(false);
    expect(resolved.rules[0]!.outputs).toEqual([{ format: "avif" }]);
  });

  it("defaults dryRun, onError and report", () => {
    const resolved = resolveOptions();
    expect(resolved.dryRun).toBe(false);
    expect(resolved.onError).toBe("skip");
    expect(resolved.report).toBe(false);
  });

  it("honours explicit dryRun, onError and report", () => {
    const resolved = resolveOptions({ dryRun: true, onError: "throw", report: "dist-compress-report.json" });
    expect(resolved.dryRun).toBe(true);
    expect(resolved.onError).toBe("throw");
    expect(resolved.report).toBe("dist-compress-report.json");
  });
});
