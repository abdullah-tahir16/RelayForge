import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useGetEvents } from '../../../infrastructure/hooks/Event/useGetEvents';
import { useGetEndpointsLookup } from '../../../infrastructure/hooks/Endpoint/useGetEndpointsLookup';
import { useProjectUseCase } from '../../../infrastructure/useCases/Project/useProjectUseCase';
import { EventFilters, EventListItem } from '../../../core/types/Event';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './consts';

export function useEventsFeature() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectUseCase();
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filters, setFilters] = useState<EventFilters>({});

  const projectId = selectedProjectId ?? '';
  const eventsQuery = useGetEvents(
    projectId,
    { page, pageSize, ...filters },
    true,
  );
  const endpointsLookupQuery = useGetEndpointsLookup(projectId);

  function updateFilters(nextFilters: EventFilters): void {
    setFilters(nextFilters);
    setPage(DEFAULT_PAGE);
  }

  function onRowClick(row: EventListItem): void {
    navigate(`/events/${row.id}`);
  }

  return {
    rows: eventsQuery.data?.items ?? [],
    total: eventsQuery.data?.total ?? 0,
    isLoading: eventsQuery.isLoading,
    page,
    pageSize,
    filters,
    endpointOptions: endpointsLookupQuery.data ?? [],
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
    onFiltersChange: updateFilters,
    onRowClick,
  };
}
