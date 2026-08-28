import Stack from '@mui/material/Stack';
import AppTable, { AppTableColumn } from '../../App/AppTable';
import AppChip from '../../App/AppChip';
import { Delivery } from '../../../../core/types/Delivery';
import AppButton from '../../App/AppButton';

export interface DeliveriesProps {
  deliveries: Delivery[];
  onInspect: (delivery: Delivery) => void;
  onReplay: (delivery: Delivery) => void;
}

const createColumns = (
  onInspect: (delivery: Delivery) => void,
  onReplay: (delivery: Delivery) => void,
): AppTableColumn<Delivery>[] => [
  {
    key: 'endpointId',
    header: 'Endpoint',
    render: (row) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <span>{row.endpointId}</span>
        {row.isTest && <AppChip status="PUBLISHED" label="Test" size="small" />}
      </Stack>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <AppChip status={row.status} label={row.status} />,
  },
  {
    key: 'httpStatusCode',
    header: 'HTTP status',
    render: (row) => row.httpStatusCode ?? '—',
  },
  {
    key: 'durationMs',
    header: 'Duration',
    render: (row) => (row.durationMs !== null ? `${row.durationMs}ms` : '—'),
  },
  { key: 'attemptCount', header: 'Attempts', render: (row) => row.attemptCount },
  {
    key: 'nextAttemptAt',
    header: 'Next attempt',
    render: (row) =>
      row.nextAttemptAt ? new Date(row.nextAttemptAt).toLocaleString() : '—',
  },
  {
    key: 'inspect',
    header: '',
    render: (row) => (
      <div>
        <AppButton size="small" variant="text" onClick={() => onInspect(row)}>
          Inspect
        </AppButton>
        {['SUCCEEDED', 'FAILED', 'DEAD_LETTERED'].includes(row.status) && (
          <AppButton size="small" variant="text" onClick={() => onReplay(row)}>
            Replay
          </AppButton>
        )}
      </div>
    ),
  },
];

const Deliveries = ({ deliveries, onInspect, onReplay }: DeliveriesProps) => {
  return (
    <AppTable
      columns={createColumns(onInspect, onReplay)}
      rows={deliveries}
      getRowKey={(row) => row.id}
      emptyMessage="No deliveries yet"
    />
  );
};

export default Deliveries;
