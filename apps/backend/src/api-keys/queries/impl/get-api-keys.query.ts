export class GetApiKeysQuery {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
  ) {}
}
