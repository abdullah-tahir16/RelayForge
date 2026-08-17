export class GetEndpointQuery {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
  ) {}
}
