export class RotateSigningSecretCommand {
  constructor(
    public readonly userId: string,
    public readonly endpointId: string,
  ) {}
}
