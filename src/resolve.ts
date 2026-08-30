import { defaultRules } from "./defaults.js";
import type { AstroDistCompressOptions, CompressRule, ResolvedOptions } from "./types.js";

const DEFAULT_EXTENSIONS = ["png", "jpg", "jpeg"];

export function resolveOptions(options: AstroDistCompressOptions = {}): ResolvedOptions {
  const rules = options.rules ?? defaultRules;

  const fallback =
    options.fallback === false
      ? (false as const)
      : {
          enabled: options.fallback?.enabled ?? true,
          format: options.fallback?.format ?? "webp",
          options: options.fallback?.options ?? { quality: 80 },
        };

  const rulesWithFallback = fallback && fallback.enabled ? rules.map((rule) => applyAutoFallback(rule, fallback)) : rules;

  return {
    rules: rulesWithFallback,
    fallback,
    rewriteHtml: options.rewriteHtml ?? true,
    removeOriginal: options.removeOriginal ?? false,
    extensions: (options.extensions ?? DEFAULT_EXTENSIONS).map((e) => e.toLowerCase().replace(/^\./, "")),
    exclude: options.exclude ?? [],
    concurrency: options.concurrency ?? 4,
    logger: options.logger ?? true,
    dryRun: options.dryRun ?? false,
    onError: options.onError ?? "skip",
    report: options.report ?? false,
  };
}

/**
 * Ensures a rule's output list includes the global fallback format, without
 * duplicating it when the rule already produces that format (e.g. the
 * png-with-alpha default rule already outputs webp).
 */
function applyAutoFallback(
  rule: CompressRule,
  fallback: { format: string; options: Record<string, unknown> },
): CompressRule {
  const alreadyHasFormat = rule.outputs.some((o) => o.format === fallback.format);
  const alreadyHasFallbackFlag = rule.outputs.some((o) => o.fallback);

  if (alreadyHasFormat) {
    // Format already produced by this rule; just make sure *something* is
    // flagged as the fallback so HTML rewriting has a definite <img src>.
    if (alreadyHasFallbackFlag) return rule;
    return {
      ...rule,
      outputs: rule.outputs.map((o) => (o.format === fallback.format ? { ...o, fallback: true } : o)),
    };
  }

  return {
    ...rule,
    outputs: [
      ...rule.outputs,
      {
        format: fallback.format as CompressRule["outputs"][number]["format"],
        options: fallback.options,
        fallback: !alreadyHasFallbackFlag,
      },
    ],
  };
}
