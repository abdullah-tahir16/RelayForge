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
    runs,
    inspectorLoading,
    inspectorError,
    onInspectDelivery,
    replayDeliveryTarget,
    eventReplayOpen,
    replayPending,
    onReplayDeliveryRequest,
    onReplayEventRequest,
    onConfirmDeliveryReplay,
    onConfirmEventReplay,
    onCancelReplay,
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
      runs={runs}
      inspectorLoading={inspectorLoading}
      inspectorError={inspectorError}
      onInspectDelivery={onInspectDelivery}
      replayDeliveryTarget={replayDeliveryTarget}
      eventReplayOpen={eventReplayOpen}
      replayPending={replayPending}
      onReplayDeliveryRequest={onReplayDeliveryRequest}
      onReplayEventRequest={onReplayEventRequest}
      onConfirmDeliveryReplay={onConfirmDeliveryReplay}
      onConfirmEventReplay={onConfirmEventReplay}
      onCancelReplay={onCancelReplay}
    />
  );
};

export default EventDetailContainer;
