import { DeliveryStatus } from '../../entities/delivery.entity';

export class GetDeliveriesQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly page?: number,
    public readonly pageSize?: number,
    public readonly status?: DeliveryStatus,
    public readonly endpointId?: string,
    public readonly eventId?: string,
    public readonly httpStatusCode?: number,
    public readonly createdFrom?: string,
    public readonly createdTo?: string,
  ) {}
}
