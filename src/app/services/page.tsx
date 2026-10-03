import { ServicesView, servicesMetadata } from '@/views/services';

export const generateMetadata = () => servicesMetadata('fa');
export default function Page() {
  return <ServicesView locale={'fa'} />;
}
