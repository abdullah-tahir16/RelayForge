export class GetProjectsQuery {
  constructor(
    public readonly userId: string,
    public readonly page?: number,
    public readonly pageSize?: number,
  ) {}
}
