import { PostView, postMetadata } from '@/views/blog';

type Props = { params: Promise<{ slug: string }> };
export const generateMetadata = (props: Props) => postMetadata('en', props);
export default function Page(props: Props) {
  return <PostView locale={'en'} params={props.params} />;
}
