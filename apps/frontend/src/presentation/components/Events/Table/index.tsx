import AppTable, { AppTableColumn } from '../../App/AppTable';
import AppChip from '../../App/AppChip';
import { EventListItem } from '../../../../core/types/Event';

export interface TableProps {
  rows: EventListItem[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick: (row: EventListItem) => void;
}

const columns: AppTableColumn<EventListItem>[] = [
  { key: 'event', header: 'Event', render: (row) => row.event },
  {
    key: 'createdAt',
    header: 'Created',
    render: (row) => new Date(row.createdAt).toLocaleString(),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <AppChip status={row.status} label={row.status} />,
  },
  {
    key: 'deliveries',
    header: 'Deliveries',
    render: (row) => `${row.deliverySucceeded}/${row.deliveryTotal}`,
  },
];

const Table = ({
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: TableProps) => {
  return (
    <AppTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
      pagination={{ page, pageSize, total, onPageChange, onPageSizeChange }}
      emptyMessage="No events yet"
    />
  );
};

export default Table;
