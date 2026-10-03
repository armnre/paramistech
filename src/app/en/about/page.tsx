import { AboutView, aboutMetadata } from '@/views/pages';

export const generateMetadata = () => aboutMetadata('en');
export default function Page() {
  return <AboutView locale={'en'} />;
}
