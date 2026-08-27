import AppLoader from '../../components/App/AppLoader';
import EndpointDetail from '../../components/EndpointDetail';
import { useEndpointDetailFeature } from '../../hooks/EndpointDetail/useEndpointDetailFeature';

const EndpointDetailContainer = () => {
  const feature = useEndpointDetailFeature();
  const { endpoint, isLoading, subscriptions, onSubscribe, onUnsubscribe } =
    feature;

  if (isLoading || !endpoint) {
    return <AppLoader />;
  }

  return (
    <EndpointDetail
      endpoint={endpoint}
      subscriptions={subscriptions}
      onSubscribe={onSubscribe}
      onUnsubscribe={onUnsubscribe}
      rotationConfirmationOpen={feature.rotationConfirmationOpen}
      isRotating={feature.isRotating}
      oneTimeSecret={feature.oneTimeSecret}
      onRequestRotate={feature.onRequestRotate}
      onConfirmRotate={feature.onConfirmRotate}
      onCancelRotate={feature.onCancelRotate}
      onOneTimeSecretAcknowledge={feature.onOneTimeSecretAcknowledge}
    />
  );
};

export default EndpointDetailContainer;
