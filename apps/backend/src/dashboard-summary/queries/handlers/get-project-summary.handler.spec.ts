import { NotFoundException } from '@nestjs/common';
import { GetProjectSummaryHandler } from './get-project-summary.handler';
import { GetProjectSummaryQuery } from '../impl/get-project-summary.query';

function createQueryBuilderMock() {
  const qb: any = {};
  const chainMethods = [
    'innerJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'orderBy',
    'addOrderBy',
    'limit',
  ];
  chainMethods.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getCount = jest.fn();
  qb.getRawMany = jest.fn();
  return qb;
}

describe('GetProjectSummaryHandler', () => {
  const userId = 'user-1';
  const projectId = 'project-1';
  const workspaceId = 'workspace-1';

  let workspacesService: { getWorkspaceIdForUser: jest.Mock };
  let projectsRepository: { findByIdInWorkspace: jest.Mock };
  let eventsCount: jest.Mock;
  let eventsQueryBuilder: ReturnType<typeof createQueryBuilderMock>;
  let events: { count: jest.Mock; createQueryBuilder: jest.Mock };
  let endpointsCount: jest.Mock;
  let endpoints: { count: jest.Mock };
  let deliveriesQueryBuilder: ReturnType<typeof createQueryBuilderMock>;
  let deliveries: { createQueryBuilder: jest.Mock };
  let handler: GetProjectSummaryHandler;

  beforeEach(() => {
    workspacesService = {
      getWorkspaceIdForUser: jest.fn().mockResolvedValue(workspaceId),
    };
    projectsRepository = {
      findByIdInWorkspace: jest.fn().mockResolvedValue({ id: projectId }),
    };

    eventsCount = jest.fn();
    eventsQueryBuilder = createQueryBuilderMock();
    events = {
      count: eventsCount,
      createQueryBuilder: jest.fn().mockReturnValue(eventsQueryBuilder),
    };

    endpointsCount = jest.fn();
    endpoints = { count: endpointsCount };

    deliveriesQueryBuilder = createQueryBuilderMock();
    deliveries = {
      createQueryBuilder: jest.fn().mockReturnValue(deliveriesQueryBuilder),
    };

    handler = new GetProjectSummaryHandler(
      workspacesService as any,
      projectsRepository as any,
      events as any,
      endpoints as any,
      deliveries as any,
    );
  });

  it('computes counts and recent activity from mixed-status data', async () => {
    eventsCount.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    deliveriesQueryBuilder.getCount.mockResolvedValue(5);
    endpointsCount.mockResolvedValueOnce(7).mockResolvedValueOnce(4);
    eventsQueryBuilder.getRawMany.mockResolvedValue([
      {
        eventId: 'evt-1',
        eventType: 'order.completed',
        status: 'COMPLETED',
        isTest: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
      {
        eventId: 'evt-2',
        eventType: 'order.failed',
        status: 'FAILED',
        isTest: 'false',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      },
    ]);

    const result = await handler.execute(
      new GetProjectSummaryQuery(userId, projectId),
    );

    expect(result).toEqual({
      inFlightCount: 3,
      needsAttentionCount: 2,
      dlqBacklogCount: 5,
      endpoints: { enabled: 7, disabled: 4 },
      recentActivity: [
        {
          eventId: 'evt-1',
          eventType: 'order.completed',
          status: 'COMPLETED',
          isTest: true,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          eventId: 'evt-2',
          eventType: 'order.failed',
          status: 'FAILED',
          isTest: false,
          createdAt: new Date('2026-01-02T00:00:00Z'),
        },
      ],
    });
  });

  it('returns zero counts and no recent activity for an empty project', async () => {
    eventsCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    deliveriesQueryBuilder.getCount.mockResolvedValue(0);
    endpointsCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    eventsQueryBuilder.getRawMany.mockResolvedValue([]);

    const result = await handler.execute(
      new GetProjectSummaryQuery(userId, projectId),
    );

    expect(result).toEqual({
      inFlightCount: 0,
      needsAttentionCount: 0,
      dlqBacklogCount: 0,
      endpoints: { enabled: 0, disabled: 0 },
      recentActivity: [],
    });
  });

  it('orders recent activity most-recent-first and bounds it to a fixed limit', async () => {
    eventsCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    deliveriesQueryBuilder.getCount.mockResolvedValue(0);
    endpointsCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    eventsQueryBuilder.getRawMany.mockResolvedValue([]);

    await handler.execute(new GetProjectSummaryQuery(userId, projectId));

    expect(eventsQueryBuilder.orderBy).toHaveBeenCalledWith(
      'event.createdAt',
      'DESC',
    );
    expect(eventsQueryBuilder.limit).toHaveBeenCalledWith(10);
  });

  it('rejects a project outside the caller workspace before running any query', async () => {
    projectsRepository.findByIdInWorkspace.mockResolvedValue(null);

    await expect(
      handler.execute(new GetProjectSummaryQuery(userId, projectId)),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(eventsCount).not.toHaveBeenCalled();
    expect(endpointsCount).not.toHaveBeenCalled();
    expect(deliveries.createQueryBuilder).not.toHaveBeenCalled();
  });
});
