import { ProjectDetailView, projectMetadata } from '@/views/projects';

type Props = { params: Promise<{ slug: string }> };
export const generateMetadata = (props: Props) => projectMetadata('en', props);
export default function Page(props: Props) {
  return <ProjectDetailView locale={'en'} params={props.params} />;
}
