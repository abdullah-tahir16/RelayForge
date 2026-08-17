export class GetSubscriptionsQuery {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
  ) {}
}
