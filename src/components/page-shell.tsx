import type { ReactNode } from 'react';
import { Footer, Header, type ShellLabels } from '@/components/site-shell';
import { getContact, getLocalizedServices } from '@/lib/content';
import { getDictionary, type Dictionary } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n/dictionary';

export function shellLabels(dict: Dictionary): ShellLabels {
  return {
    brand: dict.site.name,
    tagline: dict.site.tagline,
    nav: dict.nav,
    skip: dict.a11y.skipToContent,
    homeLink: dict.a11y.homeLink,
    mainNav: dict.a11y.mainNav,
    mobileNav: dict.a11y.mobileNav,
    openMenu: dict.a11y.openMenu,
    closeMenu: dict.a11y.closeMenu,
    toggleTheme: dict.a11y.toggleTheme,
    languageSwitch: dict.a11y.languageSwitch,
    switchText: dict.actions.switchLanguage,
    switchLabel: dict.actions.switchLanguageLabel,
    start: dict.actions.start,
    intro: dict.footer.intro,
    rights: dict.footer.rights,
    quickLinks: dict.footer.quickLinks,
    servicesHeading: dict.footer.servicesHeading,
    contactHeading: dict.footer.contactHeading,
  };
}

/** Header + footer around a page. `alternateHref` is where the language switcher points. */
export async function PageShell({ locale, alternateHref, children }: { locale: Locale; alternateHref: string; children: ReactNode }) {
  const labels = shellLabels(getDictionary(locale));
  let services: Array<{ slug: string; title: string }> = [];
  let contact = null;
  try {
    const [serviceViews, contactView] = await Promise.all([getLocalizedServices(locale), getContact(locale)]);
    services = serviceViews.map((service) => ({ slug: service.slug, title: service.title }));
    contact = contactView;
  } catch (error) {
    console.error('Footer content unavailable', error);
  }
  return (
    <>
      <Header locale={locale} alternateHref={alternateHref} labels={labels} />
      {children}
      <Footer locale={locale} alternateHref={alternateHref} labels={labels} services={services} contact={contact} />
    </>
  );
}
