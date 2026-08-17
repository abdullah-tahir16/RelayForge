export class CreateProjectCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly description?: string,
  ) {}
}
