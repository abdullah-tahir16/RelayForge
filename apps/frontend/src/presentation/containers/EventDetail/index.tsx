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
    />
  );
};

export default EventDetailContainer;
