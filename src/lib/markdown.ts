import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { headingId } from '@/lib/slug';

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function textOf(node: HastNode): string {
  if (node.type === 'text') return node.value || '';
  return (node.children || []).map(textOf).join('');
}

function addHeadingIds() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (node.type === 'element' && node.tagName && /^h[1-6]$/.test(node.tagName)) {
        node.properties = { ...(node.properties || {}), id: headingId(textOf(node)) };
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    h1: ['id'],
    h2: ['id'],
    h3: ['id'],
    h4: ['id'],
    h5: ['id'],
    h6: ['id'],
    a: [...(defaultSchema.attributes?.a || []), 'id'],
  },
};

export async function renderMarkdown(source: string) {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(addHeadingIds)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(source);
  return String(file);
}

export function readingMinutes(source: string) {
  const words = source.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function tableOfContents(source: string) {
  return [...source.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((match) => ({
    level: match[1].length,
    text: match[2].trim(),
    id: headingId(match[2]),
  }));
}
