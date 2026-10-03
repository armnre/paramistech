import { ContactView, contactMetadata } from '@/views/pages';

export const generateMetadata = () => contactMetadata('en');
export default function Page() {
  return <ContactView locale={'en'} />;
}
