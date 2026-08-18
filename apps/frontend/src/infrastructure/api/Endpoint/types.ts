import { Paginated, PaginationParams } from '../../../core/types/Pagination';
import { Endpoint, EndpointFormValues, EndpointLookupItem } from '../../../core/types/Endpoint';

export type GetEndpointsRequest = PaginationParams;
export type GetEndpointsResponse = Paginated<Endpoint>;
export type GetEndpointsLookupResponse = EndpointLookupItem[];
export type CreateEndpointRequest = EndpointFormValues;
export type UpdateEndpointRequest = EndpointFormValues;
