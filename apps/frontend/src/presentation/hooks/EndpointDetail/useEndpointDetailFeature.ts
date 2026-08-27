import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetEndpoint } from '../../../infrastructure/hooks/Endpoint/useGetEndpoint';
import { useGetSubscriptions } from '../../../infrastructure/hooks/Subscription/useGetSubscriptions';
import { useSubscribe } from '../../../infrastructure/hooks/Subscription/useSubscribe';
import { useUnsubscribe } from '../../../infrastructure/hooks/Subscription/useUnsubscribe';
import { useToast } from '../../toast/useToast';
import { Subscription } from '../../../core/types/Subscription';
import { SubscribeFormValues } from '../../components/EndpointDetail/Subscriptions/Form/data';
import { SUBSCRIPTIONS_PAGE_SIZE } from './consts';
import { useRotateEndpointSigningSecret } from '../../../infrastructure/hooks/Endpoint/useRotateEndpointSigningSecret';
import { SigningSecretRotated } from '../../../core/types/Endpoint';

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
  const rotateMutation = useRotateEndpointSigningSecret(endpointId);
  const [rotationConfirmationOpen, setRotationConfirmationOpen] =
    useState(false);
  const [oneTimeSecret, setOneTimeSecret] =
    useState<SigningSecretRotated | null>(null);

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

  async function onConfirmRotate(): Promise<void> {
    try {
      const rotated = await rotateMutation.mutateAsync();
      setOneTimeSecret(rotated);
      rotateMutation.reset();
      setRotationConfirmationOpen(false);
      toast.success('Signing secret rotated');
    } catch {
      toast.error(
        'Could not rotate signing secret — the current secret is unchanged',
      );
    }
  }

  return {
    endpoint: endpointQuery.data,
    isLoading: endpointQuery.isLoading,
    subscriptions: subscriptionsQuery.data?.items ?? [],
    onSubscribe,
    onUnsubscribe,
    rotationConfirmationOpen,
    isRotating: rotateMutation.isPending,
    oneTimeSecret,
    onRequestRotate: () => setRotationConfirmationOpen(true),
    onConfirmRotate,
    onCancelRotate: () => setRotationConfirmationOpen(false),
    onOneTimeSecretAcknowledge: () => setOneTimeSecret(null),
  };
}
