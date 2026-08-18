import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AppTable, { AppTableColumn } from '../../../App/AppTable';
import { Subscription } from '../../../../../core/types/Subscription';

export interface TableProps {
  rows: Subscription[];
  onUnsubscribe: (subscription: Subscription) => void;
}

const Table = ({ rows, onUnsubscribe }: TableProps) => {
  const columns: AppTableColumn<Subscription>[] = [
    { key: 'eventPattern', header: 'Pattern', render: (row) => row.eventPattern },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <IconButton size="small" onClick={() => onUnsubscribe(row)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <AppTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      emptyMessage="No subscriptions yet"
    />
  );
};

export default Table;
