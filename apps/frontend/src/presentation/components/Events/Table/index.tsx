import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppTable, { AppTableColumn } from '../../App/AppTable';
import AppChip from '../../App/AppChip';
import { EventListItem } from '../../../../core/types/Event';
import { relayForgeTokens } from '../../../../theme/theme';

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
  {
    key: 'event',
    header: 'Event',
    render: (row) => (
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography fontWeight={800}>{row.event}</Typography>
          {row.isTest && <AppChip status="TEST" label="Test" size="small" />}
        </Stack>
        <Typography
          variant="caption"
          sx={{
            fontFamily: relayForgeTokens.font.mono,
            overflowWrap: 'anywhere',
          }}
        >
          {row.id}
        </Typography>
      </Stack>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (row) => (
      <Typography variant="body2" sx={{ fontFamily: relayForgeTokens.font.mono }}>
        {new Date(row.createdAt).toLocaleString()}
      </Typography>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <AppChip status={row.status} label={row.status} />,
  },
  {
    key: 'deliveries',
    header: 'Deliveries',
    render: (row) => (
      <Typography fontWeight={800}>
        {row.deliverySucceeded}
        <Typography component="span" color="text.secondary">
          /{row.deliveryTotal}
        </Typography>
      </Typography>
    ),
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
