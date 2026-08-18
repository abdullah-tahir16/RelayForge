import { useParams } from 'react-router-dom';
import { useGetEndpoint } from '../../../infrastructure/hooks/Endpoint/useGetEndpoint';
import { useGetSubscriptions } from '../../../infrastructure/hooks/Subscription/useGetSubscriptions';
import { useSubscribe } from '../../../infrastructure/hooks/Subscription/useSubscribe';
import { useUnsubscribe } from '../../../infrastructure/hooks/Subscription/useUnsubscribe';
import { useToast } from '../../toast/useToast';
import { Subscription } from '../../../core/types/Subscription';
import { SubscribeFormValues } from '../../components/EndpointDetail/Subscriptions/Form/data';
import { SUBSCRIPTIONS_PAGE_SIZE } from './consts';

export function useEndpointDetailFeature() {
  const { endpointId = '' } = useParams<{ endpointId: string }>();
  const toast = useToast();

  const endpointQuery = useGetEndpoint(endpointId);
  const subscriptionsQuery = useGetSubscriptions(endpointId, {
    page: 1,
    pageSize: SUBSCRIPTIONS_PAGE_SIZE,
  });
  const subscribeMutation = useSubscribe(endpointId);
  const unsubscribeMutation = useUnsubscribe(endpointId);

  async function onSubscribe(values: SubscribeFormValues): Promise<void> {
    try {
      await subscribeMutation.mutateAsync(values.eventPattern);
      toast.success('Subscribed');
    } catch {
      toast.error('Could not subscribe — check the pattern');
    }
  }

  async function onUnsubscribe(subscription: Subscription): Promise<void> {
    try {
      await unsubscribeMutation.mutateAsync(subscription.id);
      toast.success('Unsubscribed');
    } catch {
      toast.error('Could not unsubscribe');
    }
  }

  return {
    endpoint: endpointQuery.data,
    isLoading: endpointQuery.isLoading,
    subscriptions: subscriptionsQuery.data?.items ?? [],
    onSubscribe,
    onUnsubscribe,
  };
}
