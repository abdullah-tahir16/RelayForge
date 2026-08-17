export class DeleteEndpointCommand {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
  ) {}
}
