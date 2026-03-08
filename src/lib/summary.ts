/**
 * Generate a v0 fallback summary from content.
 * Strips markdown formatting and truncates to 200 chars with "..." suffix.
 */
export function generateSummary(content: string): string {
  const stripped = content.replace(/[#*_~`>\[\]()!|-]/g, "").trim();
  if (stripped.length <= 200) return stripped;
  return stripped.slice(0, 200) + "...";
}
