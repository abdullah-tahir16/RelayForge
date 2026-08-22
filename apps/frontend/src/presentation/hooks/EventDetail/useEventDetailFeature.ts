import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetEvent } from '../../../infrastructure/hooks/Event/useGetEvent';
import { useGetDeliveries } from '../../../infrastructure/hooks/Delivery/useGetDeliveries';
import { useProjectUseCase } from '../../../infrastructure/useCases/Project/useProjectUseCase';
import { useToast } from '../../toast/useToast';
import { copyToClipboard, formatPayloadPretty } from '../../components/EventDetail/Payload/fns';
import { DELIVERIES_PAGE_SIZE } from './consts';
import { useGetDeliveryAttempts } from '../../../infrastructure/hooks/Delivery/useGetDeliveryAttempts';
import {
  Delivery,
  NON_TERMINAL_DELIVERY_STATUSES,
} from '../../../core/types/Delivery';

export function useEventDetailFeature() {
  const { eventId = '' } = useParams<{ eventId: string }>();
  const { selectedProjectId } = useProjectUseCase();
  const toast = useToast();
  const [isRawView, setIsRawView] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');

  const eventQuery = useGetEvent(eventId);
  const deliveriesQuery = useGetDeliveries(selectedProjectId ?? '', {
    eventId,
    page: 1,
    pageSize: DELIVERIES_PAGE_SIZE,
  }, true);
  const deliveries = deliveriesQuery.data?.items ?? [];
  const selectedDelivery =
    deliveries.find((delivery) => delivery.id === selectedDeliveryId) ?? null;
  const attemptsQuery = useGetDeliveryAttempts(
    selectedDeliveryId,
    Boolean(
      selectedDelivery &&
        NON_TERMINAL_DELIVERY_STATUSES.includes(selectedDelivery.status),
    ),
  );

  async function onCopyPayload(): Promise<void> {
    if (!eventQuery.data) {
      return;
    }
    await copyToClipboard(formatPayloadPretty(eventQuery.data.payload));
    toast.success('Payload copied to clipboard');
  }

  return {
    event: eventQuery.data,
    deliveries,
    selectedDelivery,
    attempts: attemptsQuery.data ?? [],
    attemptsLoading: attemptsQuery.isLoading,
    attemptsError: attemptsQuery.isError,
    isLoading: eventQuery.isLoading,
    isRawView,
    onToggleRawView: setIsRawView,
    onCopyPayload,
    onInspectDelivery: (delivery: Delivery) => setSelectedDeliveryId(delivery.id),
  };
}
