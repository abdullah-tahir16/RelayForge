import Stack from '@mui/material/Stack';
import Header from './Header';
import Filters from './Filters';
import Table from './Table';
import { EventFilters, EventListItem } from '../../../core/types/Event';
import { EndpointLookupItem } from '../../../core/types/Endpoint';

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
  return (
    <Stack spacing={3}>
      <Header />
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
