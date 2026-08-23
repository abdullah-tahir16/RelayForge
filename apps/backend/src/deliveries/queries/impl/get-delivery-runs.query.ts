export class GetDeliveryRunsQuery {
  constructor(
    public readonly userId: string,
    public readonly deliveryId: string,
  ) {}
}
