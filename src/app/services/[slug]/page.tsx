import { ServiceDetailView, serviceMetadata } from '@/views/services';

type Props = { params: Promise<{ slug: string }> };
export const generateMetadata = (props: Props) => serviceMetadata('fa', props);
export default function Page(props: Props) {
  return <ServiceDetailView locale={'fa'} params={props.params} />;
}
