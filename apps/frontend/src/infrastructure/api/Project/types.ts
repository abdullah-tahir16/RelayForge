import { Paginated, PaginationParams } from '../../../core/types/Pagination';
import { Project } from '../../../core/types/Project';

export type GetProjectsRequest = PaginationParams;
export type GetProjectsResponse = Paginated<Project>;
