import { findSlopViolations } from "./slop-filter";

export type CopyValidation = {
  ok: boolean;
  errors: string[];
};

export function validateCopy(
  content: string,
  opts?: { maxWords?: number; maxChars?: number }
): CopyValidation {
  const errors: string[] = [...findSlopViolations(content)];

  if (opts?.maxWords) {
    const words = content.trim().split(/\s+/).length;
    if (words > opts.maxWords) {
      errors.push(`Too long: ${words} words (max ${opts.maxWords})`);
    }
  }
  if (opts?.maxChars && content.length > opts.maxChars) {
    errors.push(`Too long: ${content.length} chars (max ${opts.maxChars})`);
  }

  if (!content.trim()) errors.push("Empty content");

  return { ok: errors.length === 0, errors };
}
