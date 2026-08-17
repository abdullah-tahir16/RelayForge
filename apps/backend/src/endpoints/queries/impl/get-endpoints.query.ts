export class GetEndpointsQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
  ) {}
}
