import { FaqView, faqMetadata } from '@/views/pages';

export const generateMetadata = () => faqMetadata('en');
export default function Page() {
  return <FaqView locale={'en'} />;
}
