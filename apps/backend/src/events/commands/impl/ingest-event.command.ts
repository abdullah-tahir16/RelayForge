export class IngestEventCommand {
  constructor(
    readonly projectId: string,
    readonly eventType: string,
    readonly data: Record<string, unknown>,
    readonly metadata: Record<string, unknown> | null,
  ) {}
}
