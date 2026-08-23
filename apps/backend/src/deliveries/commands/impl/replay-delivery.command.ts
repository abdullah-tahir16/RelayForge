export class ReplayDeliveryCommand {
  constructor(
    public readonly userId: string,
    public readonly deliveryId: string,
  ) {}
}
