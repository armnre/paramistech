import { LegalView, legalMetadata } from '@/views/pages';

export const generateMetadata = () => legalMetadata('en', 'terms');
export default function Page() {
  return <LegalView locale={'en'} kind="terms" />;
}
