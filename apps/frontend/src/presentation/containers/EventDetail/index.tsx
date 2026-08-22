import AppLoader from '../../components/App/AppLoader';
import EventDetail from '../../components/EventDetail';
import { useEventDetailFeature } from '../../hooks/EventDetail/useEventDetailFeature';

const EventDetailContainer = () => {
  const {
    event,
    deliveries,
    isLoading,
    isRawView,
    onToggleRawView,
    onCopyPayload,
    selectedDelivery,
    attempts,
    attemptsLoading,
    attemptsError,
    onInspectDelivery,
  } = useEventDetailFeature();

  if (isLoading || !event) {
    return <AppLoader />;
  }

  return (
    <EventDetail
      event={event}
      deliveries={deliveries}
      isRawView={isRawView}
      onToggleRawView={onToggleRawView}
      onCopyPayload={onCopyPayload}
      selectedDelivery={selectedDelivery}
      attempts={attempts}
      attemptsLoading={attemptsLoading}
      attemptsError={attemptsError}
      onInspectDelivery={onInspectDelivery}
    />
  );
};

export default EventDetailContainer;
