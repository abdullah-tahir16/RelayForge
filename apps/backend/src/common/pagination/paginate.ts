import { FindManyOptions, Repository, SelectQueryBuilder } from 'typeorm';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './pagination-query.dto';
import { PaginatedResponse } from './paginated-response.dto';

export async function paginate<T extends object>(
  repository: Repository<T>,
  options: FindManyOptions<T>,
  page = DEFAULT_PAGE,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedResponse<T>> {
  const [items, total] = await repository.findAndCount({
    ...options,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return { items, total, page, pageSize };
}

/** For filter/join-heavy queries a plain `find()` can't express — same envelope, built from a QueryBuilder instead. */
export async function paginateQueryBuilder<T extends object>(
  queryBuilder: SelectQueryBuilder<T>,
  page = DEFAULT_PAGE,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<PaginatedResponse<T>> {
  const [items, total] = await queryBuilder
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getManyAndCount();
  return { items, total, page, pageSize };
}
