import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Configuration from './Configuration';
import Subscriptions from './Subscriptions';
import { SubscribeFormValues } from './Subscriptions/Form/data';
import { Endpoint } from '../../../core/types/Endpoint';
import { Subscription } from '../../../core/types/Subscription';

export interface EndpointDetailProps {
  endpoint: Endpoint;
  subscriptions: Subscription[];
  onSubscribe: (values: SubscribeFormValues) => void;
  onUnsubscribe: (subscription: Subscription) => void;
}

const EndpointDetail = ({
  endpoint,
  subscriptions,
  onSubscribe,
  onUnsubscribe,
}: EndpointDetailProps) => {
  return (
    <Stack spacing={3}>
      <Typography variant="h5">{endpoint.name}</Typography>

      <section>
        <Typography variant="subtitle1" mb={1}>
          Configuration
        </Typography>
        <Configuration endpoint={endpoint} />
      </section>

      <section>
        <Typography variant="subtitle1" mb={1}>
          Subscriptions
        </Typography>
        <Subscriptions
          rows={subscriptions}
          onSubscribe={onSubscribe}
          onUnsubscribe={onUnsubscribe}
        />
      </section>
    </Stack>
  );
};

export default EndpointDetail;
