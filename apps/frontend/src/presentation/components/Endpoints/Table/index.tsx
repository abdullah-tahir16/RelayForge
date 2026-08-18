import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppTable, { AppTableColumn } from '../../App/AppTable';
import { Endpoint } from '../../../../core/types/Endpoint';

export interface TableProps {
  rows: Endpoint[];
  onRowClick: (endpoint: Endpoint) => void;
  onEdit: (endpoint: Endpoint) => void;
  onDelete: (endpoint: Endpoint) => void;
  onToggleEnabled: (endpoint: Endpoint) => void;
}

const Table = ({ rows, onRowClick, onEdit, onDelete, onToggleEnabled }: TableProps) => {
  const columns: AppTableColumn<Endpoint>[] = [
    { key: 'name', header: 'Name', render: (row) => row.name },
    { key: 'url', header: 'URL', render: (row) => row.url },
    { key: 'timeoutMs', header: 'Timeout', render: (row) => `${row.timeoutMs}ms` },
    {
      key: 'enabled',
      header: 'Enabled',
      render: (row) => (
        <Switch
          checked={row.enabled}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleEnabled(row)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Stack direction="row" onClick={(event) => event.stopPropagation()}>
          <IconButton size="small" onClick={() => onEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <AppTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      onRowClick={onRowClick}
      emptyMessage="No endpoints yet"
    />
  );
};

export default Table;
