import { ProjectsView, projectsMetadata } from '@/views/projects';

export const generateMetadata = () => projectsMetadata('en');
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <ProjectsView locale={'en'} category={category} />;
}
