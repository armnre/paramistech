import { ProjectsView, projectsMetadata } from '@/views/projects';

export const generateMetadata = () => projectsMetadata('fa');
export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  return <ProjectsView locale={'fa'} category={category} />;
}
