export class GetEndpointsQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly page?: number,
    public readonly pageSize?: number,
  ) {}
}
