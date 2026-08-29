import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AppTable, { AppTableColumn } from '../../../App/AppTable';
import { Subscription } from '../../../../../core/types/Subscription';
import { relayForgeTokens } from '../../../../../theme/theme';

export interface TableProps {
  rows: Subscription[];
  onUnsubscribe: (subscription: Subscription) => void;
}

const Table = ({ rows, onUnsubscribe }: TableProps) => {
  const columns: AppTableColumn<Subscription>[] = [
    {
      key: 'eventPattern',
      header: 'Pattern',
      render: (row) => (
        <code style={{ fontFamily: relayForgeTokens.font.mono }}>
          {row.eventPattern}
        </code>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <IconButton
          aria-label={`Unsubscribe ${row.eventPattern}`}
          size="small"
          color="error"
          onClick={() => onUnsubscribe(row)}
        >
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
      emptyMessage="No subscriptions configured yet"
    />
  );
};

export default Table;
