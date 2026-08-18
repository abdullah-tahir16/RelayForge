import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { ReactNode } from 'react';

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
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.key}>{column.header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                hover={Boolean(onRowClick)}
                onClick={() => onRowClick?.(row)}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
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
    </Paper>
  );
};

export default AppTable;
