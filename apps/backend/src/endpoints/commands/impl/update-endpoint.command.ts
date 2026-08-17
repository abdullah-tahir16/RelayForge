export class UpdateEndpointCommand {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
    public readonly name?: string,
    public readonly url?: string,
    public readonly description?: string,
    public readonly timeoutMs?: number,
  ) {}
}
