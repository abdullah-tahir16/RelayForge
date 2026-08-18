import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetEvent } from '../../../infrastructure/hooks/Event/useGetEvent';
import { useGetDeliveries } from '../../../infrastructure/hooks/Delivery/useGetDeliveries';
import { useProjectUseCase } from '../../../infrastructure/useCases/Project/useProjectUseCase';
import { useToast } from '../../toast/useToast';
import { copyToClipboard, formatPayloadPretty } from '../../components/EventDetail/Payload/fns';
import { DELIVERIES_PAGE_SIZE } from './consts';

export function useEventDetailFeature() {
  const { eventId = '' } = useParams<{ eventId: string }>();
  const { selectedProjectId } = useProjectUseCase();
  const toast = useToast();
  const [isRawView, setIsRawView] = useState(false);

  const eventQuery = useGetEvent(eventId);
  const deliveriesQuery = useGetDeliveries(selectedProjectId ?? '', {
    eventId,
    page: 1,
    pageSize: DELIVERIES_PAGE_SIZE,
  });

  async function onCopyPayload(): Promise<void> {
    if (!eventQuery.data) {
      return;
    }
    await copyToClipboard(formatPayloadPretty(eventQuery.data.payload));
    toast.success('Payload copied to clipboard');
  }

  return {
    event: eventQuery.data,
    deliveries: deliveriesQuery.data?.items ?? [],
    isLoading: eventQuery.isLoading,
    isRawView,
    onToggleRawView: setIsRawView,
    onCopyPayload,
  };
}
