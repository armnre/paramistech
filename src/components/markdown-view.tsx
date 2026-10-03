import { renderMarkdown } from '@/lib/markdown';

export async function MarkdownView({ source }: { source: string }) {
  if (!source.trim()) return null;
  const html = await renderMarkdown(source);
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
