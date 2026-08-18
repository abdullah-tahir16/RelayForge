export class GetEventQuery {
  constructor(
    public readonly userId: string,
    public readonly eventId: string,
  ) {}
}
