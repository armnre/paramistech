'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { BriefcaseBusiness, Camera, Globe, Languages, Mail, MapPin, Menu, Moon, Phone, Send, Sun, X } from 'lucide-react';
import { arrowsFor } from '@/components/arrows';
import { digits } from '@/lib/digits';
import { otherLocale, prefixPath, type Locale } from '@/lib/i18n/dictionary';

export type ShellLabels = {
  brand: string;
  tagline: string;
  nav: Array<{ label: string; href: string }>;
  skip: string;
  homeLink: string;
  mainNav: string;
  mobileNav: string;
  openMenu: string;
  closeMenu: string;
  toggleTheme: string;
  languageSwitch: string;
  switchText: string;
  switchLabel: string;
  start: string;
  intro: string;
  rights: string;
  quickLinks: string;
  servicesHeading: string;
  contactHeading: string;
};
export type FooterService = { slug: string; title: string };
export type ShellContact = {
  email: string;
  phone: string;
  phoneHref: string;
  address: string;
  socials: Array<{ label: string; href: string }>;
};

const socialIcons: Record<string, typeof Globe> = { لینکدین: BriefcaseBusiness, اینستاگرام: Camera, تلگرام: Send };
const socialNames: Record<string, string> = { لینکدین: 'LinkedIn', اینستاگرام: 'Instagram', تلگرام: 'Telegram' };

export function Logo({ locale, label }: { locale: Locale; label: string }) {
  return (
    <Link href={prefixPath(locale, '/')} className="logo" aria-label={label}>
      <svg className="logo-mark" viewBox="0 0 48 56" fill="none" aria-hidden="true">
        <path d="M9 35C9 17 23 5 42 3c0 18-9 31-26 34-3 5-5 10-6 15" fill="currentColor" />
        <path d="M16 37C27 37 37 30 43 20c-1 15-10 26-25 26" fill="currentColor" opacity=".76" />
        <path d="M9 52c5-17 14-27 27-37" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <span className="logo-word">ParamisTech</span>
    </Link>
  );
}

export function ThemeToggle({ label }: { label: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  return (
    <button type="button" className="theme-toggle" aria-label={label} title={label} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {mounted && theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  );
}

/** Link to the equivalent page in the other language (computed by the page, falls back to that language's home). */
export function LanguageSwitch({ locale, href, labels, variant = 'header' }: { locale: Locale; href: string; labels: ShellLabels; variant?: 'header' | 'footer' }) {
  const target = otherLocale(locale);
  // A plain anchor on purpose: <html lang dir> belongs to the root layout, which Next keeps mounted during
  // client-side navigation. Only a full page load re-renders it with the other language's lang and dir.
  return (
    <a href={href} hrefLang={target} lang={target} className={`lang-switch lang-switch-${variant}`} aria-label={labels.switchLabel} title={labels.languageSwitch}>
      <Languages size={17} aria-hidden="true" />
      <span>{labels.switchText}</span>
    </a>
  );
}

export function Header({ locale, alternateHref, labels }: { locale: Locale; alternateHref: string; labels: ShellLabels }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { Forward } = arrowsFor(locale);
  const home = prefixPath(locale, '/');

  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (href: string) => {
    const target = prefixPath(locale, href);
    return target === home ? path === home : path === target || path.startsWith(`${target}/`);
  };

  return (
    <>
      <a className="skip-link" href="#main">{labels.skip}</a>
      <header className={`site-header ${scrolled ? 'scrolled' : ''} ${open ? 'menu-open' : ''}`}>
        <div className="container header-inner">
          <Logo locale={locale} label={labels.homeLink} />
          <nav className="desktop-nav" aria-label={labels.mainNav}>
            {labels.nav.map((item) => (
              <Link className={`nav-link ${isActive(item.href) ? 'active' : ''}`} key={item.href} href={prefixPath(locale, item.href)} aria-current={isActive(item.href) ? 'page' : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <ThemeToggle label={labels.toggleTheme} />
            <LanguageSwitch locale={locale} href={alternateHref} labels={labels} />
            <Link href={prefixPath(locale, '/contact')} className="btn btn-primary">
              {labels.start}
              <Forward size={18} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <button ref={toggleRef} type="button" className="menu-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? labels.closeMenu : labels.openMenu}>
              {open ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" className="mobile-menu" aria-label={labels.mobileNav}>
            {labels.nav.map((item) => (
              <Link key={item.href} href={prefixPath(locale, item.href)} onClick={() => setOpen(false)} className={isActive(item.href) ? 'active' : ''} aria-current={isActive(item.href) ? 'page' : undefined}>
                {item.label}
              </Link>
            ))}
            <Link href={prefixPath(locale, '/contact')} className="btn btn-primary" onClick={() => setOpen(false)}>
              {labels.start}
              <Forward size={16} aria-hidden="true" />
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}

export function Footer({ locale, alternateHref, labels, services, contact }: { locale: Locale; alternateHref: string; labels: ShellLabels; services: FooterService[]; contact: ShellContact | null }) {
  const { ForwardUp } = arrowsFor(locale);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-about">
            <Logo locale={locale} label={labels.homeLink} />
            <p>{labels.intro}</p>
            {contact && contact.socials.length > 0 && (
              <div className="socials">
                {contact.socials.map((social) => {
                  const Icon = socialIcons[social.label] ?? Globe;
                  const name = locale === 'en' ? (socialNames[social.label] ?? social.label) : social.label;
                  return (
                    <a key={social.href} href={social.href} aria-label={name} target="_blank" rel="noopener noreferrer">
                      <Icon size={19} aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            )}
            <LanguageSwitch locale={locale} href={alternateHref} labels={labels} variant="footer" />
          </div>
          <div>
            <h3>{labels.quickLinks}</h3>
            <ul className="footer-list">
              {labels.nav.map((item) => (
                <li key={item.href}><Link href={prefixPath(locale, item.href)}>{item.label}</Link></li>
              ))}
            </ul>
          </div>
          {services.length > 0 && (
            <div>
              <h3>{labels.servicesHeading}</h3>
              <ul className="footer-list">
                {services.map((item) => (
                  <li key={item.slug}><Link href={prefixPath(locale, `/services/${item.slug}`)}>{item.title}</Link></li>
                ))}
              </ul>
            </div>
          )}
          {contact && (contact.email || contact.phone || contact.address) && (
            <div>
              <h3>{labels.contactHeading}</h3>
              <ul className="footer-list footer-contact">
                {contact.email && <li><Mail size={16} aria-hidden="true" /><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
                {contact.phone && <li><Phone size={16} aria-hidden="true" /><a href={`tel:${contact.phoneHref}`} dir="ltr">{contact.phone}</a></li>}
                {contact.address && <li><MapPin size={16} aria-hidden="true" /><span>{contact.address}</span></li>}
              </ul>
            </div>
          )}
        </div>
        <div className="footer-bottom">
          <span>© {digits(locale, new Date().getFullYear())} {labels.brand}. {labels.rights}</span>
          <span>{labels.tagline} <ForwardUp size={13} style={{ display: 'inline' }} aria-hidden="true" /></span>
        </div>
      </div>
    </footer>
  );
}
