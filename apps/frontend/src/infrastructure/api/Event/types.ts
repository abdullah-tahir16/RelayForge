import { Paginated } from '../../../core/types/Pagination';
import { EventFilters, EventListItem } from '../../../core/types/Event';

export interface GetEventsRequest extends EventFilters {
  page?: number;
  pageSize?: number;
}
export type GetEventsResponse = Paginated<EventListItem>;
