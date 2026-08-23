export class GetDlqQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly page?: number,
    public readonly pageSize?: number,
  ) {}
}
