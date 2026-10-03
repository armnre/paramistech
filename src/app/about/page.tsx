import { AboutView, aboutMetadata } from '@/views/pages';

export const generateMetadata = () => aboutMetadata('fa');
export default function Page() {
  return <AboutView locale={'fa'} />;
}
