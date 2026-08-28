import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppChip from '../App/AppChip';
import Payload from './Payload';
import Deliveries from './Deliveries';
import Timeline from './Timeline';
import { EventDetail as EventDetailType } from '../../../core/types/Event';
import { Delivery, DeliveryAttempt, DeliveryRun } from '../../../core/types/Delivery';
import DeliveryRunInspector from '../DeliveryRunInspector';
import AppButton from '../App/AppButton';
import AppConfirmDialog from '../App/AppConfirmDialog';

export interface EventDetailProps {
  event: EventDetailType;
  deliveries: Delivery[];
  isRawView: boolean;
  onToggleRawView: (isRawView: boolean) => void;
  onCopyPayload: () => void;
  selectedDelivery: Delivery | null;
  attempts: DeliveryAttempt[];
  runs: DeliveryRun[];
  inspectorLoading: boolean;
  inspectorError: boolean;
  onInspectDelivery: (delivery: Delivery) => void;
  replayDeliveryTarget: Delivery | null;
  eventReplayOpen: boolean;
  replayPending: boolean;
  onReplayDeliveryRequest: (delivery: Delivery) => void;
  onReplayEventRequest: () => void;
  onConfirmDeliveryReplay: () => void;
  onConfirmEventReplay: () => void;
  onCancelReplay: () => void;
}

const EventDetail = ({
  event,
  deliveries,
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
}: EventDetailProps) => {
  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
        <Typography variant="h5">{event.event}</Typography>
        <AppChip status={event.status} label={event.status} />
        {event.isTest && <AppChip status="PUBLISHED" label="Test delivery" />}
        <AppButton variant="outlined" onClick={onReplayEventRequest}>
          Replay failed deliveries
        </AppButton>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Created {new Date(event.createdAt).toLocaleString()}
      </Typography>

      <section>
        <Typography variant="subtitle1" mb={1}>
          Payload
        </Typography>
        <Payload
          payload={event.payload}
          isRawView={isRawView}
          onToggleRawView={onToggleRawView}
          onCopy={onCopyPayload}
        />
      </section>

      <section>
        <Typography variant="subtitle1" mb={1}>
          Deliveries
        </Typography>
        <Deliveries
          deliveries={deliveries}
          onInspect={onInspectDelivery}
          onReplay={onReplayDeliveryRequest}
        />
      </section>

      {selectedDelivery && (
        <section>
          <Typography variant="subtitle1" mb={1} sx={{ overflowWrap: 'anywhere' }}>
            Run history for delivery {selectedDelivery.id}
          </Typography>
          <DeliveryRunInspector
            runs={runs}
            attempts={attempts}
            isLoading={inspectorLoading}
            isError={inspectorError}
          />
        </section>
      )}

      <section>
        <Typography variant="subtitle1" mb={1}>
          Timeline
        </Typography>
        <Timeline event={event} deliveries={deliveries} />
      </section>

      <AppConfirmDialog
        open={Boolean(replayDeliveryTarget)}
        title="Replay this delivery?"
        description="This starts a new run with the original event payload and the endpoint's current configuration. It may send an external webhook immediately."
        confirmLabel="Replay delivery"
        loading={replayPending}
        onConfirm={onConfirmDeliveryReplay}
        onCancel={onCancelReplay}
      />
      <AppConfirmDialog
        open={eventReplayOpen}
        title="Replay failed deliveries?"
        description="Eligible failed and dead-lettered deliveries will start new runs. Disabled endpoints and active deliveries will be skipped."
        confirmLabel="Replay failed deliveries"
        loading={replayPending}
        onConfirm={onConfirmEventReplay}
        onCancel={onCancelReplay}
      />
    </Stack>
  );
};

export default EventDetail;
