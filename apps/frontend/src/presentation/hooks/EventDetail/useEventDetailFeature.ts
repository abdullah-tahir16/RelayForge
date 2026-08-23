import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetEvent } from '../../../infrastructure/hooks/Event/useGetEvent';
import { useGetDeliveries } from '../../../infrastructure/hooks/Delivery/useGetDeliveries';
import { useProjectUseCase } from '../../../infrastructure/useCases/Project/useProjectUseCase';
import { useToast } from '../../toast/useToast';
import { copyToClipboard, formatPayloadPretty } from '../../components/EventDetail/Payload/fns';
import { DELIVERIES_PAGE_SIZE } from './consts';
import { useGetDeliveryAttempts } from '../../../infrastructure/hooks/Delivery/useGetDeliveryAttempts';
import { useGetDeliveryRuns } from '../../../infrastructure/hooks/Delivery/useGetDeliveryRuns';
import { useReplayDelivery } from '../../../infrastructure/hooks/Delivery/useReplayDelivery';
import { useReplayEvent } from '../../../infrastructure/hooks/Delivery/useReplayEvent';
import {
  Delivery,
  NON_TERMINAL_DELIVERY_STATUSES,
} from '../../../core/types/Delivery';
import { replayFailureMessage } from '../DeadLetterQueue/useDeadLetterQueueFeature';

export function useEventDetailFeature() {
  const { eventId = '' } = useParams<{ eventId: string }>();
  const { selectedProjectId } = useProjectUseCase();
  const toast = useToast();
  const [isRawView, setIsRawView] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [replayDeliveryTarget, setReplayDeliveryTarget] = useState<Delivery | null>(null);
  const [eventReplayOpen, setEventReplayOpen] = useState(false);

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
  const runsQuery = useGetDeliveryRuns(
    selectedDeliveryId,
    Boolean(
      selectedDelivery &&
        NON_TERMINAL_DELIVERY_STATUSES.includes(selectedDelivery.status),
    ),
  );
  const replayDeliveryMutation = useReplayDelivery(selectedProjectId ?? '');
  const replayEventMutation = useReplayEvent(selectedProjectId ?? '');

  async function onCopyPayload(): Promise<void> {
    if (!eventQuery.data) {
      return;
    }
    await copyToClipboard(formatPayloadPretty(eventQuery.data.payload));
    toast.success('Payload copied to clipboard');
  }

  async function onConfirmDeliveryReplay(): Promise<void> {
    if (!replayDeliveryTarget) return;
    try {
      const result = await replayDeliveryMutation.mutateAsync(
        replayDeliveryTarget.id,
      );
      setSelectedDeliveryId(replayDeliveryTarget.id);
      setReplayDeliveryTarget(null);
      toast.success(
        result.status === 'resumed'
          ? `Replay publication resumed for run ${result.runNumber}`
          : `Replay run ${result.runNumber} started`,
      );
    } catch (error) {
      toast.error(replayFailureMessage(error));
    }
  }

  async function onConfirmEventReplay(): Promise<void> {
    if (!eventId) return;
    try {
      const result = await replayEventMutation.mutateAsync(eventId);
      setEventReplayOpen(false);
      const started = result.started.length + result.resumed.length;
      const detail = `${started} started or resumed, ${result.skipped.length} skipped`;
      if (result.publicationFailed.length > 0) {
        toast.error(
          `${detail}, ${result.publicationFailed.length} publication failed. Retry the event to resume unpublished runs.`,
        );
      } else {
        toast.success(`Event replay: ${detail}`);
      }
    } catch (error) {
      toast.error(replayFailureMessage(error));
    }
  }

  return {
    event: eventQuery.data,
    deliveries,
    selectedDelivery,
    attempts: attemptsQuery.data ?? [],
    runs: runsQuery.data ?? [],
    inspectorLoading: attemptsQuery.isLoading || runsQuery.isLoading,
    inspectorError: attemptsQuery.isError || runsQuery.isError,
    isLoading: eventQuery.isLoading,
    isRawView,
    onToggleRawView: setIsRawView,
    onCopyPayload,
    onInspectDelivery: (delivery: Delivery) => setSelectedDeliveryId(delivery.id),
    replayDeliveryTarget,
    eventReplayOpen,
    replayPending: replayDeliveryMutation.isPending || replayEventMutation.isPending,
    onReplayDeliveryRequest: setReplayDeliveryTarget,
    onReplayEventRequest: () => setEventReplayOpen(true),
    onConfirmDeliveryReplay,
    onConfirmEventReplay,
    onCancelReplay: () => {
      setReplayDeliveryTarget(null);
      setEventReplayOpen(false);
    },
  };
}
