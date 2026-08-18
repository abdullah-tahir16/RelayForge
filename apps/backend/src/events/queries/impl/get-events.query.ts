import { EventStatus } from '../../entities/event.entity';

export class GetEventsQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly page?: number,
    public readonly pageSize?: number,
    public readonly eventType?: string,
    public readonly status?: EventStatus,
    public readonly createdFrom?: string,
    public readonly createdTo?: string,
    public readonly endpointId?: string,
  ) {}
}
