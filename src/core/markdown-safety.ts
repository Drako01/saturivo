/**
 * Escape untrusted single-line text before inserting it in Markdown prose or
 * table cells. URL images/links in imported scenario names or warnings must
 * not turn into active Markdown when a report is previewed.
 */
export function escapeMarkdownInline(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/([\\\`*_{}\[\]()#+.!|~-])/g, "\\$1");
}
