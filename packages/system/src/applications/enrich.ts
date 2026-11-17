/**
 * Enrich HTML through the v14 TextEditor implementation. The global `TextEditor`
 * is a deprecated compatibility shim (removed in v15).
 */
export function enrichHTML(html: string, options: object = {}): Promise<string> {
  return foundry.applications.ux.TextEditor.implementation.enrichHTML(html, options);
}
