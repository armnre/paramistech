import { LegalView, legalMetadata } from '@/views/pages';

export const generateMetadata = () => legalMetadata('fa', 'terms');
export default function Page() {
  return <LegalView locale={'fa'} kind="terms" />;
}
