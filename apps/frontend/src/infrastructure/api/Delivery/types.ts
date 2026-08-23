import { Paginated } from '../../../core/types/Pagination';
import {
  Delivery,
  DeliveryFilters,
  DlqItem,
} from '../../../core/types/Delivery';

export interface GetDeliveriesRequest extends DeliveryFilters {
  page?: number;
  pageSize?: number;
}
export type GetDeliveriesResponse = Paginated<Delivery>;

export interface GetDlqRequest {
  page?: number;
  pageSize?: number;
}

export type GetDlqResponse = Paginated<DlqItem>;
