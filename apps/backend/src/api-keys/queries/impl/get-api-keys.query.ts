export class GetApiKeysQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly page?: number,
    public readonly pageSize?: number,
  ) {}
}
