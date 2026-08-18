import { Paginated } from '../../../core/types/Pagination';
import { Delivery, DeliveryFilters } from '../../../core/types/Delivery';

export interface GetDeliveriesRequest extends DeliveryFilters {
  page?: number;
  pageSize?: number;
}
export type GetDeliveriesResponse = Paginated<Delivery>;
