export class RegisterEndpointCommand {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly name: string,
    public readonly url: string,
    public readonly description?: string,
    public readonly timeoutMs?: number,
  ) {}
}
