export class UnsubscribeCommand {
  constructor(
    public readonly userId: string,
    public readonly subscriptionId: string,
  ) {}
}
