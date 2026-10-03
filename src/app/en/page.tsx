import { HomeView, homeMetadata } from '@/views/home';

export const generateMetadata = () => homeMetadata('en');
export default function Page() {
  return <HomeView locale={'en'} />;
}
