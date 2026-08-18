import AppLoader from '../../components/App/AppLoader';
import EndpointDetail from '../../components/EndpointDetail';
import { useEndpointDetailFeature } from '../../hooks/EndpointDetail/useEndpointDetailFeature';

const EndpointDetailContainer = () => {
  const { endpoint, isLoading, subscriptions, onSubscribe, onUnsubscribe } =
    useEndpointDetailFeature();

  if (isLoading || !endpoint) {
    return <AppLoader />;
  }

  return (
    <EndpointDetail
      endpoint={endpoint}
      subscriptions={subscriptions}
      onSubscribe={onSubscribe}
      onUnsubscribe={onUnsubscribe}
    />
  );
};

export default EndpointDetailContainer;
