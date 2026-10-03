import { BlogView, blogMetadata } from '@/views/blog';

export const generateMetadata = () => blogMetadata('en');
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <BlogView locale={'en'} page={page} />;
}
