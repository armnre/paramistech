import { revalidatePath, revalidateTag } from 'next/cache';

const tags = ['services', 'projects', 'posts', 'faqs', 'settings', 'media'] as const;

export function revalidateContent(paths: string[] = ['/', '/services', '/projects', '/blog', '/faq', '/contact']) {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  for (const path of paths) revalidatePath(path);
}
