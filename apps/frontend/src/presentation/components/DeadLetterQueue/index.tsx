import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  DeliveryAttempt,
  DeliveryRun,
  DlqItem,
} from '../../../core/types/Delivery';
import AppConfirmDialog from '../App/AppConfirmDialog';
import AppLoader from '../App/AppLoader';
import DeliveryRunInspector from '../DeliveryRunInspector';
import DeadLetterTable from './Table';

export interface DeadLetterQueueProps {
  rows: DlqItem[];
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
  isError: boolean;
  selectedDeliveryId: string;
  runs: DeliveryRun[];
  attempts: DeliveryAttempt[];
  inspectorLoading: boolean;
  inspectorError: boolean;
  replayTarget: DlqItem | null;
  disableTarget: DlqItem | null;
  mutationPending: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onInspect: (item: DlqItem) => void;
  onReplayRequest: (item: DlqItem) => void;
  onReplayConfirm: () => void;
  onDisableRequest: (item: DlqItem) => void;
  onDisableConfirm: () => void;
  onCancelAction: () => void;
}

const DeadLetterQueue = (props: DeadLetterQueueProps) => (
  <Stack spacing={3}>
    <div>
      <Typography variant="h5">Dead Letter Queue</Typography>
      <Typography variant="body2" color="text.secondary" mt={0.5}>
        Inspect exhausted delivery runs, repair endpoints, and replay safely.
      </Typography>
    </div>

    {props.isError ? (
      <Alert severity="error" role="alert">
        The dead letter queue could not be loaded. Check connectivity and try again.
      </Alert>
    ) : props.isLoading ? (
      <AppLoader />
    ) : (
      <DeadLetterTable
        rows={props.rows}
        page={props.page}
        pageSize={props.pageSize}
        total={props.total}
        onPageChange={props.onPageChange}
        onPageSizeChange={props.onPageSizeChange}
        onInspect={props.onInspect}
        onReplay={props.onReplayRequest}
        onDisableEndpoint={props.onDisableRequest}
      />
    )}

    {props.selectedDeliveryId && (
      <section aria-labelledby="delivery-run-history-heading">
        <Typography id="delivery-run-history-heading" variant="h6" mb={1.5} sx={{ overflowWrap: 'anywhere' }}>
          Run history · {props.selectedDeliveryId}
        </Typography>
        <DeliveryRunInspector
          runs={props.runs}
          attempts={props.attempts}
          isLoading={props.inspectorLoading}
          isError={props.inspectorError}
        />
      </section>
    )}

    <AppConfirmDialog
      open={Boolean(props.replayTarget)}
      title="Replay this delivery?"
      description="This starts a new delivery run using the original event payload and the endpoint's current configuration. It may send an external webhook immediately."
      confirmLabel="Replay delivery"
      loading={props.mutationPending}
      onConfirm={props.onReplayConfirm}
      onCancel={props.onCancelAction}
    />
    <AppConfirmDialog
      open={Boolean(props.disableTarget)}
      title="Disable this endpoint?"
      description="New matching events and manual replays will not be delivered to this endpoint until it is enabled again."
      confirmLabel="Disable endpoint"
      loading={props.mutationPending}
      onConfirm={props.onDisableConfirm}
      onCancel={props.onCancelAction}
    />
  </Stack>
);

export default DeadLetterQueue;
