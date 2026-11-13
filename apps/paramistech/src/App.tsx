import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@project/components/ui/sonner';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Showcase from './components/Showcase';
import Preloader from './components/Preloader';
import Testimonials from './components/Testimonials';
import { Services, Process } from './components/Services';
import Projects from './components/Projects';
import Faq from './components/Faq';
import Contact from './components/Contact';
import { Cta, Footer } from './components/Footer';
import Palette from './components/Palette';
import { ContentProvider } from './content';
import InstallPrompt from './portal/InstallPrompt';

const AdminApp = lazy(() => import('./admin/AdminApp'));
const PortalApp = lazy(() => import('./portal/PortalApp'));

function Site() {
  const [palette, setPalette] = useState(false);
  useEffect(() => { document.title = 'پارامیس‌تک | طراحی و توسعه نرم‌افزار'; }, []);
  return (
    <ContentProvider>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
        <Preloader />
        <Navbar onPalette={() => setPalette(true)} />
        <main>
          <Hero />
          <Showcase />
          <Services />
          <Process />
          <Projects />
          <Testimonials />
          <Cta />
          <Faq />
          <Contact />
        </main>
        <Footer />
        <Palette open={palette} setOpen={setPalette} />
        <InstallPrompt />
      </div>
    </ContentProvider>
  );
}

const Spinner = () => <div className="flex min-h-screen items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" /></div>;

export default function App() {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'fa';
  }, []);
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/portal/*" element={<PortalApp />} />
          <Route path="*" element={<Site />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" />
    </BrowserRouter>
  );
}
