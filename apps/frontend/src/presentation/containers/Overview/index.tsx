import Overview from '../../components/Overview';
import { useOverviewFeature } from '../../hooks/Overview/useOverviewFeature';

const OverviewContainer = () => {
  const feature = useOverviewFeature();
  return <Overview {...feature} />;
};

export default OverviewContainer;
