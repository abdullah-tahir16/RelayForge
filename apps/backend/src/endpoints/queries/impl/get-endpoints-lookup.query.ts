export class GetEndpointsLookupQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
  ) {}
}
