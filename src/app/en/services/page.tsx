import { ServicesView, servicesMetadata } from '@/views/services';

export const generateMetadata = () => servicesMetadata('en');
export default function Page() {
  return <ServicesView locale={'en'} />;
}
