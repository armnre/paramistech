import { PostView, postMetadata } from '@/views/blog';

type Props = { params: Promise<{ slug: string }> };
export const generateMetadata = (props: Props) => postMetadata('fa', props);
export default function Page(props: Props) {
  return <PostView locale={'fa'} params={props.params} />;
}
