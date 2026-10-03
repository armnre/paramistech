import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { arrowsFor } from '@/components/arrows';
import { ProjectCard, ProjectVisual } from '@/components/home-sections';
import { MarkdownView } from '@/components/markdown-view';
import { LocaleLink, PageIntro } from '@/components/page-parts';
import { PageShell } from '@/components/page-shell';
import { findProject, getLocalizedProjects } from '@/lib/content';
import { getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/dictionary';
import { breadcrumbList, JsonLd } from '@/lib/json-ld';
import type { ProjectView } from '@/lib/localize';
import { samePaths, switcherHref, type LocalePaths } from '@/lib/seo';
import { pageMetadata, type SlugParams } from '@/views/shared';

export function projectsMetadata(locale: Locale): Metadata {
  const dict = getDictionary(locale);
  return pageMetadata(locale, samePaths('/projects'), { title: dict.projects.title, description: dict.projects.subtitle });
}

export async function ProjectsView({ locale, category }: { locale: Locale; category?: string }) {
  const dict = getDictionary(locale);
  const all = await getLocalizedProjects(locale);
  const categories = [...new Set(all.flatMap((project) => (project.category ? [project.category] : [])))];
  const shown = category ? all.filter((project) => project.category === category) : all;
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, samePaths('/projects'))}>
      <main id="main">
        <PageIntro locale={locale} title={dict.projects.title} subtitle={dict.projects.subtitle} crumb={dict.projects.title} />
        <section className="section">
          <div className="container">
            {all.length === 0 ? (
              <div className="card admin-empty">{dict.projects.empty}</div>
            ) : (
              <>
                {categories.length > 0 && (
                  <nav className="filter-row" aria-label={dict.a11y.filterProjects}>
                    <LocaleLink locale={locale} className={`chip ${!category ? 'active' : ''}`} href="/projects" aria-current={!category ? 'page' : undefined}>
                      {dict.projects.all}
                    </LocaleLink>
                    {categories.map((item) => (
                      <LocaleLink key={item} locale={locale} className={`chip ${category === item ? 'active' : ''}`} href={`/projects?category=${encodeURIComponent(item)}`} aria-current={category === item ? 'page' : undefined}>
                        {item}
                      </LocaleLink>
                    ))}
                  </nav>
                )}
                <div className="projects-grid">
                  {shown.map((project) => <ProjectCard key={project.slug} locale={locale} project={project} />)}
                </div>
              </>
            )}
          </div>
        </section>
        <JsonLd data={breadcrumbList(locale, [{ name: dict.a11y.home, path: '/' }, { name: dict.projects.title, path: '/projects' }])} />
      </main>
    </PageShell>
  );
}

const pathsOf = (project: ProjectView): LocalePaths => ({
  fa: `/projects/${project.slugs.fa}`,
  en: project.slugs.en ? `/projects/${project.slugs.en}` : null,
});

export async function projectMetadata(locale: Locale, { params }: SlugParams): Promise<Metadata> {
  const { slug } = await params;
  const project = await findProject(locale, slug);
  if (!project) return { title: getDictionary(locale).notFound.title, robots: { index: false } };
  return pageMetadata(locale, pathsOf(project), {
    title: project.metaTitle || project.title,
    description: project.metaDescription || project.summary,
    ogImage: false,
  });
}

export async function ProjectDetailView({ locale, params }: { locale: Locale } & SlugParams) {
  const dict = getDictionary(locale);
  const { slug } = await params;
  const project = await findProject(locale, slug);
  if (!project) notFound();
  const all = await getLocalizedProjects(locale);
  const index = all.findIndex((item) => item.slug === slug);
  const next = all.length > 1 ? all[(index + 1) % all.length] : null;
  const { Forward } = arrowsFor(locale);
  const meta = [project.category, project.year].filter(Boolean).join(' · ');
  return (
    <PageShell locale={locale} alternateHref={switcherHref(locale, pathsOf(project))}>
      <main id="main">
        <PageIntro locale={locale} title={project.title} subtitle={project.summary} crumb={project.title} />
        <section className="section">
          <div className="container">
            <div className="project-hero-art">
              <ProjectVisual locale={locale} project={project} />
            </div>
            <div className="prose-block">
              {project.isPlaceholder && <p className="notice">{dict.projects.notice}</p>}
              {meta && (<><h2>{dict.projects.overview}</h2><p>{meta}</p></>)}
              {project.challengeMd && (<><h2>{dict.projects.challenge}</h2><MarkdownView source={project.challengeMd} /></>)}
              {project.solutionMd && (<><h2>{dict.projects.solution}</h2><MarkdownView source={project.solutionMd} /></>)}
              {project.resultsMd && (<><h2>{dict.projects.results}</h2><MarkdownView source={project.resultsMd} /></>)}
              {project.techTags.length > 0 && (
                <>
                  <h2>{dict.projects.tech}</h2>
                  <ul className="filter-row tag-list">
                    {project.techTags.map((tag) => <li className="chip" key={tag} dir="ltr">{tag}</li>)}
                  </ul>
                </>
              )}
              <LocaleLink locale={locale} className="btn btn-primary" href="/contact">
                {dict.actions.start}
                <Forward size={17} aria-hidden="true" />
              </LocaleLink>
              {next && next.slug !== slug && (
                <p className="next-link">
                  <LocaleLink locale={locale} className="text-link" href={`/projects/${next.slug}`}>
                    {dict.projects.next}: {next.title}
                    <Forward size={16} aria-hidden="true" />
                  </LocaleLink>
                </p>
              )}
            </div>
          </div>
        </section>
        <JsonLd data={breadcrumbList(locale, [
          { name: dict.a11y.home, path: '/' },
          { name: dict.projects.title, path: '/projects' },
          { name: project.title, path: `/projects/${project.slug}` },
        ])} />
      </main>
    </PageShell>
  );
}

