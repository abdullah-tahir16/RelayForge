import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AppTable, { AppTableColumn } from '../../App/AppTable';
import AppChip from '../../App/AppChip';
import { Endpoint } from '../../../../core/types/Endpoint';
import { relayForgeTokens } from '../../../../theme/theme';

export interface TableProps {
  rows: Endpoint[];
  onRowClick: (endpoint: Endpoint) => void;
  onEdit: (endpoint: Endpoint) => void;
  onDelete: (endpoint: Endpoint) => void;
  onToggleEnabled: (endpoint: Endpoint) => void;
}

const Table = ({ rows, onRowClick, onEdit, onDelete, onToggleEnabled }: TableProps) => {
  const columns: AppTableColumn<Endpoint>[] = [
    {
      key: 'name',
      header: 'Endpoint',
      render: (row) => (
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography fontWeight={800}>{row.name}</Typography>
            <AppChip
              status={row.enabled ? 'ENABLED' : 'DISABLED'}
              label={row.enabled ? 'Enabled' : 'Disabled'}
            />
          </Stack>
          {row.description && (
            <Typography variant="caption" color="text.secondary">
              {row.description}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'url',
      header: 'URL',
      render: (row) => (
        <Typography
          component="code"
          variant="body2"
          sx={{ fontFamily: relayForgeTokens.font.mono, overflowWrap: 'anywhere' }}
        >
          {row.url}
        </Typography>
      ),
    },
    { key: 'timeoutMs', header: 'Timeout', render: (row) => `${row.timeoutMs}ms` },
    {
      key: 'enabled',
      header: 'Toggle',
      render: (row) => (
        <Switch
          checked={row.enabled}
          inputProps={{
            'aria-label': `${row.enabled ? 'Disable' : 'Enable'} ${row.name}`,
          }}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleEnabled(row)}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Stack direction="row" spacing={0.5} onClick={(event) => event.stopPropagation()}>
          <IconButton aria-label={`Edit ${row.name}`} size="small" onClick={() => onEdit(row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton aria-label={`Delete ${row.name}`} size="small" color="error" onClick={() => onDelete(row)}>
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
      emptyMessage="No endpoints configured yet"
    />
  );
};

export default Table;
