import { LegalView, legalMetadata } from '@/views/pages';

export const generateMetadata = () => legalMetadata('en', 'privacy');
export default function Page() {
  return <LegalView locale={'en'} kind="privacy" />;
}
