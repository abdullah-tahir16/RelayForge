import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppChip from '../App/AppChip';
import Payload from './Payload';
import Deliveries from './Deliveries';
import Timeline from './Timeline';
import { EventDetail as EventDetailType } from '../../../core/types/Event';
import { Delivery, DeliveryAttempt } from '../../../core/types/Delivery';
import DeliveryAttempts from './DeliveryAttempts';

export interface EventDetailProps {
  event: EventDetailType;
  deliveries: Delivery[];
  isRawView: boolean;
  onToggleRawView: (isRawView: boolean) => void;
  onCopyPayload: () => void;
  selectedDelivery: Delivery | null;
  attempts: DeliveryAttempt[];
  attemptsLoading: boolean;
  attemptsError: boolean;
  onInspectDelivery: (delivery: Delivery) => void;
}

const EventDetail = ({
  event,
  deliveries,
  isRawView,
  onToggleRawView,
  onCopyPayload,
  selectedDelivery,
  attempts,
  attemptsLoading,
  attemptsError,
  onInspectDelivery,
}: EventDetailProps) => {
  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h5">{event.event}</Typography>
        <AppChip status={event.status} label={event.status} />
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
        <Deliveries deliveries={deliveries} onInspect={onInspectDelivery} />
      </section>

      {selectedDelivery && (
        <section>
          <Typography variant="subtitle1" mb={1}>
            Attempts for delivery {selectedDelivery.id}
          </Typography>
          <DeliveryAttempts
            attempts={attempts}
            isLoading={attemptsLoading}
            isError={attemptsError}
          />
        </section>
      )}

      <section>
        <Typography variant="subtitle1" mb={1}>
          Timeline
        </Typography>
        <Timeline event={event} deliveries={deliveries} />
      </section>
    </Stack>
  );
};

export default EventDetail;
