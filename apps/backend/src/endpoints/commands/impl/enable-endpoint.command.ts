export class EnableEndpointCommand {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
  ) {}
}
