export class GetSubscriptionsQuery {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
    public readonly page?: number,
    public readonly pageSize?: number,
  ) {}
}
