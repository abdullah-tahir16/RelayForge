import { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useTestEndpoint } from '../../../infrastructure/hooks/Endpoint/useTestEndpoint';

export function useEndpointDetailFeature() {
  const { endpointId = '' } = useParams<{ endpointId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const endpointQuery = useGetEndpoint(endpointId);
  const subscriptionsQuery = useGetSubscriptions(endpointId, {
    page: 1,
    pageSize: SUBSCRIPTIONS_PAGE_SIZE,
  });
  const subscribeMutation = useSubscribe(endpointId);
  const unsubscribeMutation = useUnsubscribe(endpointId);
  const rotateMutation = useRotateEndpointSigningSecret(endpointId);
  const testMutation = useTestEndpoint(
    endpointQuery.data?.projectId ?? '',
    endpointId,
  );
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

  async function onTestEndpoint(): Promise<void> {
    if (!endpointQuery.data) return;
    if (!endpointQuery.data.enabled) {
      toast.error('Disabled endpoints cannot receive test deliveries');
      return;
    }

    try {
      const result = await testMutation.mutateAsync();
      toast.success('Test delivery started');
      navigate(`/events/${result.eventId}?deliveryId=${result.deliveryId}`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.error('Disabled endpoints cannot receive test deliveries');
        return;
      }
      toast.error('Could not start endpoint test delivery');
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
    isTesting: testMutation.isPending,
    oneTimeSecret,
    onTestEndpoint,
    onRequestRotate: () => setRotationConfirmationOpen(true),
    onConfirmRotate,
    onCancelRotate: () => setRotationConfirmationOpen(false),
    onOneTimeSecretAcknowledge: () => setOneTimeSecret(null),
  };
}
