import Stack from '@mui/material/Stack';
import Form from './Form';
import Table from './Table';
import { SubscribeFormValues } from './Form/data';
import { Subscription } from '../../../../core/types/Subscription';

export interface SubscriptionsProps {
  rows: Subscription[];
  onSubscribe: (values: SubscribeFormValues) => void;
  onUnsubscribe: (subscription: Subscription) => void;
}

const Subscriptions = ({ rows, onSubscribe, onUnsubscribe }: SubscriptionsProps) => {
  return (
    <Stack spacing={2}>
      <Form onSubmit={onSubscribe} />
      <Table rows={rows} onUnsubscribe={onUnsubscribe} />
    </Stack>
  );
};

export default Subscriptions;
