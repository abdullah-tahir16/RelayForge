import axios from 'axios';
import { useState } from 'react';
import { NON_TERMINAL_DELIVERY_STATUSES, DlqItem } from '../../../core/types/Delivery';
import { useDisableEndpoint } from '../../../infrastructure/hooks/Endpoint/useDisableEndpoint';
import { useGetDeliveryAttempts } from '../../../infrastructure/hooks/Delivery/useGetDeliveryAttempts';
import { useGetDeliveryRuns } from '../../../infrastructure/hooks/Delivery/useGetDeliveryRuns';
import { useGetDlq } from '../../../infrastructure/hooks/Delivery/useGetDlq';
import { useReplayDelivery } from '../../../infrastructure/hooks/Delivery/useReplayDelivery';
import { useProjectUseCase } from '../../../infrastructure/useCases/Project/useProjectUseCase';
import { useToast } from '../../toast/useToast';

export function useDeadLetterQueueFeature() {
  const { selectedProjectId } = useProjectUseCase();
  const projectId = selectedProjectId ?? '';
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [replayTarget, setReplayTarget] = useState<DlqItem | null>(null);
  const [disableTarget, setDisableTarget] = useState<DlqItem | null>(null);
  const [followActiveRun, setFollowActiveRun] = useState(false);

  const dlqQuery = useGetDlq(projectId, { page, pageSize });
  const runsQuery = useGetDeliveryRuns(selectedDeliveryId, followActiveRun);
  const latestRun = runsQuery.data?.at(-1);
  const shouldPollInspector = Boolean(
    followActiveRun &&
      (!latestRun || NON_TERMINAL_DELIVERY_STATUSES.includes(latestRun.status)),
  );
  const attemptsQuery = useGetDeliveryAttempts(
    selectedDeliveryId,
    shouldPollInspector,
  );
  const replayMutation = useReplayDelivery(projectId);
  const disableMutation = useDisableEndpoint(projectId);

  async function confirmReplay(): Promise<void> {
    if (!replayTarget) return;
    try {
      const result = await replayMutation.mutateAsync(replayTarget.deliveryId);
      setSelectedDeliveryId(replayTarget.deliveryId);
      setFollowActiveRun(true);
      setReplayTarget(null);
      toast.success(
        result.status === 'resumed'
          ? `Replay publication resumed for run ${result.runNumber}`
          : `Replay run ${result.runNumber} started`,
      );
    } catch (error) {
      toast.error(replayFailureMessage(error));
    }
  }

  async function confirmDisable(): Promise<void> {
    if (!disableTarget) return;
    try {
      await disableMutation.mutateAsync(disableTarget.endpointId);
      setDisableTarget(null);
      toast.success('Endpoint disabled');
    } catch {
      toast.error('Endpoint could not be disabled. Check connectivity and try again.');
    }
  }

  return {
    rows: dlqQuery.data?.items ?? [],
    total: dlqQuery.data?.total ?? 0,
    page,
    pageSize,
    isLoading: dlqQuery.isLoading,
    isError: dlqQuery.isError,
    selectedDeliveryId,
    runs: runsQuery.data ?? [],
    attempts: attemptsQuery.data ?? [],
    inspectorLoading: runsQuery.isLoading || attemptsQuery.isLoading,
    inspectorError: runsQuery.isError || attemptsQuery.isError,
    replayTarget,
    disableTarget,
    mutationPending: replayMutation.isPending || disableMutation.isPending,
    onPageChange: setPage,
    onPageSizeChange: (next: number) => {
      setPageSize(next);
      setPage(1);
    },
    onInspect: (item: DlqItem) => {
      setSelectedDeliveryId(item.deliveryId);
      setFollowActiveRun(false);
    },
    onReplayRequest: setReplayTarget,
    onReplayConfirm: confirmReplay,
    onDisableRequest: setDisableTarget,
    onDisableConfirm: confirmDisable,
    onCancelAction: () => {
      setReplayTarget(null);
      setDisableTarget(null);
    },
  };
}

export function replayFailureMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'Replay could not be started. Check connectivity and try again.';
  }
  if (error.response?.status === 503) {
    return 'The replay run was saved, but Kafka publication failed. Choose Replay again to resume the same run.';
  }
  if (error.response?.status === 409) {
    const message = error.response.data?.message;
    return typeof message === 'string'
      ? message
      : 'Replay is unavailable because the endpoint is disabled or delivery work is already active.';
  }
  return 'Replay could not be started. Check connectivity and try again.';
}
