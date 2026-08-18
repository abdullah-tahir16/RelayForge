import { Paginated, PaginationParams } from '../../../core/types/Pagination';
import { Subscription } from '../../../core/types/Subscription';

export type GetSubscriptionsRequest = PaginationParams;
export type GetSubscriptionsResponse = Paginated<Subscription>;

export interface SubscribeRequest {
  eventPattern: string;
}
