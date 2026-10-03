import Image from 'next/image';
import {
  BrainCircuit,
  Building2,
  Check,
  CloudCog,
  Code2,
  PenLine,
  Search,
  Send,
  Smartphone,
} from 'lucide-react';
import { arrowsFor } from '@/components/arrows';
import { HeroVisual } from '@/components/hero-visual';
import { Reveal } from '@/components/motion-parts';
import { ArrowLink, LocaleLink, SectionHeader } from '@/components/page-parts';
import { digits } from '@/lib/digits';
import { fmt, getDictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/dictionary';
import type { ArtVariant, CoverView, ProjectView, ServiceView } from '@/lib/localize';

const serviceIcons = { building: Building2, smartphone: Smartphone, cloud: CloudCog, brain: BrainCircuit };
const processIcons = [Search, PenLine, Code2, Send];

export function Hero({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const { Forward, ForwardUp } = arrowsFor(locale);
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow-line" />
          <h1>{dict.hero.title}</h1>
          <p>{dict.site.description}</p>
          <div className="hero-actions">
            <LocaleLink locale={locale} href="/contact" className="btn btn-primary">
              {dict.actions.request}
              <Forward size={18} aria-hidden="true" />
            </LocaleLink>
            <LocaleLink locale={locale} href="/projects" className="btn btn-outline">
              {dict.actions.portfolio}
              <ForwardUp size={17} aria-hidden="true" />
            </LocaleLink>
          </div>
          <ul className="hero-benefits" aria-label={dict.a11y.heroBenefits}>
            {dict.hero.benefits.map((benefit) => (
              <li key={benefit}>
                <span aria-hidden="true">
                  <Check size={12} strokeWidth={2.2} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual label={dict.hero.visualLabel} chips={dict.hero.chips} />
      </div>
    </section>
  );
}

export function ServiceCard({ locale, service }: { locale: Locale; service: Pick<ServiceView, 'slug' | 'title' | 'shortDescription' | 'icon'> }) {
  const dict = getDictionary(locale);
  const Icon = serviceIcons[service.icon as keyof typeof serviceIcons] ?? Building2;
  const label = fmt(dict.actions.moreAbout, { title: service.title });
  return (
    <article className="card service-card">
      <div className="service-icon">
        <Icon size={29} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <h3>{service.title}</h3>
      <p>{service.shortDescription}</p>
      <ArrowLink locale={locale} href={`/services/${service.slug}`}>{label}</ArrowLink>
    </article>
  );
}

export function Services({ locale, items }: { locale: Locale; items: ServiceView[] }) {
  if (items.length === 0) return null;
  const dict = getDictionary(locale);
  return (
    <section className="section" id="services">
      <div className="container">
        <Reveal>
          <SectionHeader title={dict.services.title} subtitle={dict.services.subtitle} />
        </Reveal>
        <div className="services-grid">
          {items.map((service, index) => (
            <Reveal key={service.slug} delay={index * 0.05}>
              <ServiceCard locale={locale} service={service} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export type ProjectCardData = Pick<ProjectView, 'slug' | 'title' | 'category' | 'summary' | 'cover' | 'art'>;

function Mockup({ art }: { art: ArtVariant }) {
  return (
    <>
      <div className={`art-device ${art === 'store' ? 'wide' : 'main'}`}>
        <div className="art-top" />
        <div className="art-line short" />
        <div className="art-graph" />
        <div className="art-line" />
        <div className="art-tiles"><span /><span /><span /></div>
      </div>
      {art !== 'store' && (
        <div className="art-device secondary">
          <div className="art-top" />
          <div className="art-line short" />
          <div className="art-graph" />
          <div className="art-line" />
          <div className="art-tiles"><span /><span /></div>
        </div>
      )}
    </>
  );
}

export function ProjectVisual({ locale, project }: { locale: Locale; project: ProjectCardData & { cover: CoverView } }) {
  const dict = getDictionary(locale);
  const badge = project.category ? <span className="project-badge">{project.category}</span> : null;
  if (project.cover) {
    return (
      <div className="project-art">
        <Image
          src={`/api/media/${project.cover.id}`}
          alt={project.cover.altText}
          width={project.cover.width}
          height={project.cover.height}
          sizes="(max-width: 767px) 83vw, 380px"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {badge}
      </div>
    );
  }
  return (
    <div className={`project-art ${project.art}`} role="img" aria-label={fmt(dict.projects.artLabel, { title: project.title })}>
      {badge}
      <Mockup art={project.art} />
    </div>
  );
}

export function ProjectCard({ locale, project }: { locale: Locale; project: ProjectCardData }) {
  const dict = getDictionary(locale);
  const title = fmt(dict.actions.viewProject, { title: project.title });
  return (
    <article className="card project-card">
      <LocaleLink locale={locale} href={`/projects/${project.slug}`} aria-label={project.title}>
        <ProjectVisual locale={locale} project={project} />
      </LocaleLink>
      <div className="project-card-body">
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
        <ArrowLink locale={locale} href={`/projects/${project.slug}`} ariaLabel={title}>{dict.actions.view}</ArrowLink>
      </div>
    </article>
  );
}

export function Projects({ locale, items }: { locale: Locale; items: ProjectView[] }) {
  if (items.length === 0) return null;
  const dict = getDictionary(locale);
  return (
    <section className="section projects-section" id="projects">
      <div className="container">
        <Reveal>
          <SectionHeader title={dict.projects.sectionTitle} subtitle={dict.projects.sectionSubtitle} centered={false} />
        </Reveal>
        <div className="projects-grid">
          {items.map((project, index) => (
            <Reveal key={project.slug} delay={index * 0.06}>
              <ProjectCard locale={locale} project={project} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Process({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <section className="section">
      <div className="container">
        <Reveal>
          <SectionHeader title={dict.process.title} subtitle={dict.process.subtitle} />
        </Reveal>
        <div className="process-grid">
          {dict.process.steps.map((step, index) => {
            const Icon = processIcons[index];
            return (
              <Reveal key={step.title} delay={index * 0.06}>
                <div className="process-step">
                  <div className="process-icon"><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></div>
                  <h3>{digits(locale, index + 1)}. {step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const { Forward } = arrowsFor(locale);
  return (
    <div className="container">
      <section className="cta-banner">
        <h2>{dict.cta.title}</h2>
        <p>{dict.cta.subtitle}</p>
        <LocaleLink locale={locale} href="/contact" className="btn btn-light">
          {dict.actions.start}
          <Forward size={17} aria-hidden="true" />
        </LocaleLink>
      </section>
    </div>
  );
}
