export class GetDeliveryAttemptsQuery {
  constructor(
    public readonly userId: string,
    public readonly deliveryId: string,
  ) {}
}
