export class RevokeApiKeyCommand {
  constructor(
    public readonly userId: string,
    public readonly apiKeyId: string,
  ) {}
}
