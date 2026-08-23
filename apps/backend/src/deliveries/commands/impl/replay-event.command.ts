export class ReplayEventCommand {
  constructor(
    public readonly userId: string,
    public readonly eventId: string,
  ) {}
}
