import Stack from '@mui/material/Stack';
import Header from './Header';
import Filters from './Filters';
import Table from './Table';
import { EventFilters, EventListItem } from '../../../core/types/Event';
import { EndpointLookupItem } from '../../../core/types/Endpoint';
import AppMetricStrip from '../App/AppMetricStrip';

export interface EventsProps {
  rows: EventListItem[];
  page: number;
  pageSize: number;
  total: number;
  filters: EventFilters;
  endpointOptions: EndpointLookupItem[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onFiltersChange: (filters: EventFilters) => void;
  onRowClick: (row: EventListItem) => void;
}

const Events = ({
  rows,
  page,
  pageSize,
  total,
  filters,
  endpointOptions,
  onPageChange,
  onPageSizeChange,
  onFiltersChange,
  onRowClick,
}: EventsProps) => {
  const activeCount = rows.filter((row) =>
    ['ACCEPTED', 'PUBLISHED', 'PROCESSING'].includes(row.status),
  ).length;
  const failedCount = rows.filter((row) =>
    ['PARTIALLY_FAILED', 'FAILED', 'DEAD_LETTERED'].includes(row.status),
  ).length;
  const testCount = rows.filter((row) => row.isTest).length;

  return (
    <Stack spacing={3}>
      <Header />
      <AppMetricStrip
        metrics={[
          {
            label: 'Matching events',
            value: total.toLocaleString(),
            helper: `${rows.length} visible on this page`,
            tone: 'neutral',
          },
          {
            label: 'In flight',
            value: activeCount,
            helper: 'Accepted, published, or processing',
            tone: 'info',
          },
          {
            label: 'Needs attention',
            value: failedCount,
            helper: 'Failed, partial, or dead-lettered',
            tone: failedCount > 0 ? 'danger' : 'accent',
          },
          {
            label: 'Test traffic',
            value: testCount,
            helper: 'Synthetic endpoint checks',
            tone: 'accent',
          },
        ]}
      />
      <Filters
        filters={filters}
        endpointOptions={endpointOptions}
        onChange={onFiltersChange}
      />
      <Table
        rows={rows}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onRowClick={onRowClick}
      />
    </Stack>
  );
};

export default Events;
