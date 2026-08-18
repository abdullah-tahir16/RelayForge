import Events from '../../components/Events';
import { useEventsFeature } from '../../hooks/Events/useEventsFeature';

const EventsContainer = () => {
  const {
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
  } = useEventsFeature();

  return (
    <Events
      rows={rows}
      page={page}
      pageSize={pageSize}
      total={total}
      filters={filters}
      endpointOptions={endpointOptions}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onFiltersChange={onFiltersChange}
      onRowClick={onRowClick}
    />
  );
};

export default EventsContainer;
