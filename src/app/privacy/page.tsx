import { LegalView, legalMetadata } from '@/views/pages';

export const generateMetadata = () => legalMetadata('fa', 'privacy');
export default function Page() {
  return <LegalView locale={'fa'} kind="privacy" />;
}
