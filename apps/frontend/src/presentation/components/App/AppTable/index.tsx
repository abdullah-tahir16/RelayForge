import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ReactNode } from 'react';
import { relayForgeTokens } from '../../../../theme/theme';
import AppEmptyState from '../AppEmptyState';
import AppSurface from '../AppSurface';

export interface AppTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export interface AppTablePagination {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface AppTableProps<T> {
  columns: AppTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pagination?: AppTablePagination;
  emptyMessage?: string;
}

const AppTable = <T,>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  pagination,
  emptyMessage = 'No results',
}: AppTableProps<T>) => {
  return (
    <AppSurface sx={{ boxShadow: '0 12px 28px rgba(55, 46, 32, 0.07)' }}>
      <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
        <Table
          size="small"
          sx={{
            minWidth: 680,
            '& .MuiTableCell-root': {
              px: { xs: 2, sm: 2.25 },
              py: 1.35,
            },
          }}
        >
          <TableHead>
            <TableRow
              sx={{
                bgcolor: alpha(relayForgeTokens.color.surfaceRecessed, 0.52),
              }}
            >
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <Typography variant="caption" fontWeight={800}>
                    {column.header}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <AppEmptyState
                    title={emptyMessage}
                    description="Once matching data exists, it will appear here with the same operational status treatment used across RelayForge."
                  />
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                hover={Boolean(onRowClick)}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onKeyDown={(event) => {
                  if (!onRowClick) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 160ms ease, box-shadow 160ms ease',
                  '&:hover': {
                    bgcolor: alpha(relayForgeTokens.color.accent, 0.045),
                  },
                  '&:focus-visible': {
                    outline: `3px solid ${alpha(relayForgeTokens.color.accent, 0.36)}`,
                    outlineOffset: -3,
                    bgcolor: alpha(relayForgeTokens.color.accent, 0.07),
                  },
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {pagination && (
        <TablePagination
          component="div"
          sx={{
            borderTop: 1,
            borderColor: alpha(relayForgeTokens.color.borderStrong, 0.38),
            bgcolor: alpha(relayForgeTokens.color.surfaceRaised, 0.58),
          }}
          count={pagination.total}
          page={pagination.page - 1}
          rowsPerPage={pagination.pageSize}
          onPageChange={(_event, newPage) =>
            pagination.onPageChange(newPage + 1)
          }
          onRowsPerPageChange={(event) =>
            pagination.onPageSizeChange(Number(event.target.value))
          }
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      )}
    </AppSurface>
  );
};

export default AppTable;
