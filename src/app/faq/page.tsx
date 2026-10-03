import { FaqView, faqMetadata } from '@/views/pages';

export const generateMetadata = () => faqMetadata('fa');
export default function Page() {
  return <FaqView locale={'fa'} />;
}
