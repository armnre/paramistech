import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MarkdownView } from '@/components/markdown-view';
import { LocaleLink, PageIntro } from '@/components/page-parts';
import { PageShell } from '@/components/page-shell';
import { digits } from '@/lib/digits';
import { findPost, getLocalizedPosts, getRelatedPosts } from '@/lib/content';
import { fmt, getDictionary } from '@/lib/i18n';
import { prefixPath, type Locale } from '@/lib/i18n/dictionary';
import { breadcrumbList, inLanguage, JsonLd } from '@/lib/json-ld';
import type { PostView } from '@/lib/localize';
import { readingMinutes, tableOfContents } from '@/lib/markdown';
import { absoluteUrl, samePaths, siteUrl, switcherHref, type LocalePaths } from '@/lib/seo';
import { plainExcerpt } from '@/lib/text';
import { pageMetadata, type SlugParams } from '@/views/shared';

const pageSize = 9;

export function blogMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  return pageMetadata(locale, samePaths('/blog'), { title: dict.blog.title, description: dict.blog.subtitle });
}

export async function BlogView({ locale, page: requestedPage }: { locale: Locale; page?: string }) {
  const dict = getDictionary(locale);
  const requested = Number(requestedPage || 1);
  const page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const posts = await getLocalizedPosts(locale);
  const slice = posts.slice((page - 1) * pageSize, page * pageSize);
  const pagesCount = Math.ceil(posts.length / pageSize);
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, samePaths('/blog'))}>
      <main id="main">
        <PageIntro locale={locale} title={dict.blog.title} subtitle={dict.blog.subtitle} crumb={dict.blog.title} />
        <section className="section">
          <div className="container">
            {slice.length === 0 ? (
              <div className="card admin-empty">{dict.blog.empty}</div>
            ) : (
              <>
                <div className="projects-grid">
                  {slice.map((post) => (
                    <article className="card service-card" key={post.slug}>
                      <h2><LocaleLink locale={locale} href={`/blog/${post.slug}`}>{post.title}</LocaleLink></h2>
                      <p>{post.excerpt || plainExcerpt(post.bodyMd, 120)}</p>
                      <LocaleLink locale={locale} className="text-link" href={`/blog/${post.slug}`}>{fmt(dict.blog.read, { title: post.title })}</LocaleLink>
                    </article>
                  ))}
                </div>
                {pagesCount > 1 && (
                  <nav className="filter-row pager" aria-label={dict.a11y.pagination}>
                    {Array.from({ length: pagesCount }, (_, index) => (
                      <LocaleLink key={index} locale={locale} className={`chip ${page === index + 1 ? 'active' : ''}`} href={index === 0 ? '/blog' : `/blog?page=${index + 1}`} aria-current={page === index + 1 ? 'page' : undefined}>
                        {digits(locale, index + 1)}
                      </LocaleLink>
                    ))}
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
        <JsonLd data={breadcrumbList(locale, [{ name: dict.a11y.home, path: '/' }, { name: dict.blog.title, path: '/blog' }])} />
      </main>
    </PageShell>
  );
}

const pathsOf = (post: PostView): LocalePaths => ({
  fa: `/blog/${post.slugs.fa}`,
  en: post.slugs.en ? `/blog/${post.slugs.en}` : null,
});

export async function postMetadata(locale: Locale, { params }: SlugParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPost(locale, slug);
  if (!post) return { title: getDictionary(locale).notFound.title, robots: { index: false } };
  return pageMetadata(locale, pathsOf(post), {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || plainExcerpt(post.bodyMd),
    noindex: post.noindex,
    ogImage: false,
  });
}

export async function PostView({ locale, params }: { locale: Locale } & SlugParams) {
  const dict = getDictionary(locale);
  const { slug } = await params;
  const post = await findPost(locale, slug);
  if (!post) notFound();
  const related = await getRelatedPosts(locale, slug);
  const toc = tableOfContents(post.bodyMd);
  const url = absoluteUrl(locale, `/blog/${post.slug}`);
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || plainExcerpt(post.bodyMd),
    inLanguage: inLanguage(locale),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Person', name: post.author || dict.site.brand },
    mainEntityOfPage: url,
    ...(post.cover ? { image: `${siteUrl()}/api/media/${post.cover.id}` } : {}),
  };
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, pathsOf(post))}>
      <main id="main">
        <PageIntro locale={locale} title={post.title} subtitle={post.excerpt} crumb={post.title} />
        <section className="section">
          <div className="container prose-block">
            {post.cover && (
              <Image className="post-cover" src={`/api/media/${post.cover.id}`} alt={post.cover.altText} width={post.cover.width} height={post.cover.height} sizes="(max-width: 800px) 100vw, 800px" priority />
            )}
            <p>{fmt(dict.blog.minutes, { n: digits(locale, readingMinutes(post.bodyMd)) })}</p>
            {toc.length > 0 && (
              <nav aria-label={dict.a11y.toc}>
                {toc.map((item) => (
                  <div key={item.id} style={{ paddingInlineStart: item.level === 3 ? 16 : 0 }}><a href={`#${item.id}`}>{item.text}</a></div>
                ))}
              </nav>
            )}
            <MarkdownView source={post.bodyMd} />
            {related.length > 0 && (
              <>
                <h2>{dict.blog.related}</h2>
                <ul>{related.map((item) => <li key={item.slug}><LocaleLink locale={locale} href={`/blog/${item.slug}`}>{item.title}</LocaleLink></li>)}</ul>
              </>
            )}
          </div>
        </section>
        <JsonLd data={structured} />
        <JsonLd data={breadcrumbList(locale, [
          { name: dict.a11y.home, path: '/' },
          { name: dict.blog.title, path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ])} />
      </main>
    </PageShell>
  );
}

export async function rssResponse(locale: Locale) {
  const dict = getDictionary(locale);
  const base = siteUrl();
  const escape = (value: string) =>
    value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] ?? c);
  const posts = (await getLocalizedPosts(locale)).filter((post) => !post.noindex);
  const items = posts
    .map((post) => {
      const link = `${base}${prefixPath(locale, `/blog/${post.slug}`)}`;
      return `
    <item>
      <title>${escape(post.title)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <description>${escape(post.excerpt || plainExcerpt(post.bodyMd))}</description>
      ${post.publishedAt ? `<pubDate>${post.publishedAt.toUTCString()}</pubDate>` : ''}
    </item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(dict.blog.rssTitle)}</title>
    <link>${base}${prefixPath(locale, '/blog')}</link>
    <description>${escape(dict.site.description)}</description>
    <language>${locale}</language>${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
