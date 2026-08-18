import AppTable, { AppTableColumn } from '../../App/AppTable';
import AppChip from '../../App/AppChip';
import { Delivery } from '../../../../core/types/Delivery';

export interface DeliveriesProps {
  deliveries: Delivery[];
}

const columns: AppTableColumn<Delivery>[] = [
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
];

const Deliveries = ({ deliveries }: DeliveriesProps) => {
  return (
    <AppTable
      columns={columns}
      rows={deliveries}
      getRowKey={(row) => row.id}
      emptyMessage="No deliveries yet"
    />
  );
};

export default Deliveries;
