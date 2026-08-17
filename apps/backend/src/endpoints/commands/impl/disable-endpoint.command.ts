export class DisableEndpointCommand {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
  ) {}
}
