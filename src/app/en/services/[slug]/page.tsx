import { ServiceDetailView, serviceMetadata } from '@/views/services';

type Props = { params: Promise<{ slug: string }> };
export const generateMetadata = (props: Props) => serviceMetadata('en', props);
export default function Page(props: Props) {
  return <ServiceDetailView locale={'en'} params={props.params} />;
}
