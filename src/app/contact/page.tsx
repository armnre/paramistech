import { ContactView, contactMetadata } from '@/views/pages';

export const generateMetadata = () => contactMetadata('fa');
export default function Page() {
  return <ContactView locale={'fa'} />;
}
