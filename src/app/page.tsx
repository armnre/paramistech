import { HomeView, homeMetadata } from '@/views/home';

export const generateMetadata = () => homeMetadata('fa');
export default function Page() {
  return <HomeView locale={'fa'} />;
}
