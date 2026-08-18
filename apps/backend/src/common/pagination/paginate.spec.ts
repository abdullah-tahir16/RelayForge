import { Repository, SelectQueryBuilder } from 'typeorm';
import { paginate, paginateQueryBuilder } from './paginate';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from './pagination-query.dto';

describe('paginate', () => {
  function makeRepository(items: unknown[], total: number) {
    return {
      findAndCount: jest.fn().mockResolvedValue([items, total]),
    } as unknown as Repository<object>;
  }

  it('applies default page and pageSize when not specified', async () => {
    const repository = makeRepository([{ id: '1' }], 1);
    const result = await paginate(repository, {});
    expect(result).toEqual({
      items: [{ id: '1' }],
      total: 1,
      page: DEFAULT_PAGE,
      pageSize: DEFAULT_PAGE_SIZE,
    });
    expect(repository.findAndCount).toHaveBeenCalledWith({
      skip: 0,
      take: DEFAULT_PAGE_SIZE,
    });
  });

  it('computes skip/take from an explicit page and pageSize', async () => {
    const repository = makeRepository([], 50);
    await paginate(repository, { where: { foo: 'bar' } }, 3, 10);
    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: { foo: 'bar' },
      skip: 20,
      take: 10,
    });
  });

  it('returns the envelope shape with total, page, and pageSize', async () => {
    const repository = makeRepository([{ id: '1' }, { id: '2' }], 37);
    const result = await paginate(repository, {}, 2, 2);
    expect(result).toEqual({
      items: [{ id: '1' }, { id: '2' }],
      total: 37,
      page: 2,
      pageSize: 2,
    });
  });
});

describe('paginateQueryBuilder', () => {
  function makeQueryBuilder(items: unknown[], total: number) {
    const qb = {
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([items, total]),
    };
    return qb as unknown as SelectQueryBuilder<object>;
  }

  it('applies skip/take from page and pageSize and returns the envelope', async () => {
    const qb = makeQueryBuilder([{ id: 'a' }], 12);
    const result = await paginateQueryBuilder(qb, 3, 5);
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      items: [{ id: 'a' }],
      total: 12,
      page: 3,
      pageSize: 5,
    });
  });

  it('applies defaults when page/pageSize are not specified', async () => {
    const qb = makeQueryBuilder([], 0);
    const result = await paginateQueryBuilder(qb);
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(DEFAULT_PAGE_SIZE);
    expect(result.page).toBe(DEFAULT_PAGE);
  });
});
