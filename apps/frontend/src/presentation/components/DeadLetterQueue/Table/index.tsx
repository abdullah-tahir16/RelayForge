import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DlqItem } from '../../../../core/types/Delivery';
import AppButton from '../../App/AppButton';
import AppTable, { AppTableColumn } from '../../App/AppTable';
import AppChip from '../../App/AppChip';

export interface DeadLetterTableProps {
  rows: DlqItem[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onInspect: (item: DlqItem) => void;
  onReplay: (item: DlqItem) => void;
  onDisableEndpoint: (item: DlqItem) => void;
}

function columns(props: Pick<DeadLetterTableProps, 'onInspect' | 'onReplay' | 'onDisableEndpoint'>): AppTableColumn<DlqItem>[] {
  return [
    {
      key: 'event',
      header: 'Event',
      render: (row) => (
        <Stack spacing={0.25}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" fontWeight={600}>{row.eventType}</Typography>
            {row.isTest && <AppChip status="PUBLISHED" label="Test" size="small" />}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            {row.eventId}
          </Typography>
        </Stack>
      ),
    },
    { key: 'endpoint', header: 'Endpoint', render: (row) => row.endpointName },
    { key: 'failure', header: 'Failure', render: (row) => row.failureReason },
    { key: 'attempts', header: 'Attempts', render: (row) => row.attemptCount },
    {
      key: 'lastAttempt',
      header: 'Last attempt',
      render: (row) => row.lastAttemptAt ? new Date(row.lastAttemptAt).toLocaleString() : '—',
    },
    { key: 'created', header: 'Created', render: (row) => new Date(row.createdAt).toLocaleString() },
    {
      key: 'deadLettered',
      header: 'Dead-lettered',
      render: (row) => new Date(row.deadLetteredAt).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
          <AppButton size="small" variant="outlined" onClick={() => props.onInspect(row)}>
            Inspect
          </AppButton>
          <AppButton size="small" onClick={() => props.onReplay(row)}>
            Replay
          </AppButton>
          <AppButton
            size="small"
            variant="text"
            color="error"
            disabled={!row.endpointEnabled}
            onClick={() => props.onDisableEndpoint(row)}
          >
            {row.endpointEnabled ? 'Disable endpoint' : 'Endpoint disabled'}
          </AppButton>
        </Stack>
      ),
    },
  ];
}

const DeadLetterTable = (props: DeadLetterTableProps) => (
  <AppTable
    columns={columns(props)}
    rows={props.rows}
    getRowKey={(row) => row.deliveryId}
    pagination={{
      page: props.page,
      pageSize: props.pageSize,
      total: props.total,
      onPageChange: props.onPageChange,
      onPageSizeChange: props.onPageSizeChange,
    }}
    emptyMessage="No deliveries are currently dead-lettered"
  />
);

export default DeadLetterTable;
