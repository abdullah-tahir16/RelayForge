import AppTable, { AppTableColumn } from '../../App/AppTable';
import AppChip from '../../App/AppChip';
import { Delivery } from '../../../../core/types/Delivery';
import AppButton from '../../App/AppButton';

export interface DeliveriesProps {
  deliveries: Delivery[];
  onInspect: (delivery: Delivery) => void;
}

const createColumns = (onInspect: (delivery: Delivery) => void): AppTableColumn<Delivery>[] => [
  { key: 'endpointId', header: 'Endpoint', render: (row) => row.endpointId },
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
      <AppButton size="small" variant="text" onClick={() => onInspect(row)}>
        Inspect
      </AppButton>
    ),
  },
];

const Deliveries = ({ deliveries, onInspect }: DeliveriesProps) => {
  return (
    <AppTable
      columns={createColumns(onInspect)}
      rows={deliveries}
      getRowKey={(row) => row.id}
      emptyMessage="No deliveries yet"
    />
  );
};

export default Deliveries;
