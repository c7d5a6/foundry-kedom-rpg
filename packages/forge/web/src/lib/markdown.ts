import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

/** Render description Markdown to HTML for Forge preview (and later Foundry export). */
export function renderMarkdown(source: string): string {
  const trimmed = source.trim();
  if (trimmed === "") return "";
  return md.render(trimmed);
}

/** Insert a Markdown image (data URL or http(s)). */
export function markdownImage(alt: string, src: string): string {
  const safeAlt = alt.replaceAll("]", "");
  return `![${safeAlt}](${src})`;
}

/** Insert or wrap a Markdown link. */
export function markdownLink(text: string, url: string): string {
  return `[${text || url}](${url})`;
}
