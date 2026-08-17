export class SubscribeEndpointCommand {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
    public readonly eventPattern: string,
  ) {}
}
