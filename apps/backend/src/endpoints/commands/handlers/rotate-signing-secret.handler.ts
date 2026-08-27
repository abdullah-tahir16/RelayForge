import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { RotateSigningSecretCommand } from '../impl/rotate-signing-secret.command';
import { EndpointAuthorizationService } from '../../services/endpoint-authorization.service';
import { EndpointSigningMaterialService } from '../../services/endpoint-signing-material.service';
import { EndpointEntity } from '../../entities/endpoint.entity';
import { SigningSecretRotatedResponseDto } from '../../dto/endpoint-response.dto';

@CommandHandler(RotateSigningSecretCommand)
export class RotateSigningSecretHandler
  implements
    ICommandHandler<
      RotateSigningSecretCommand,
      SigningSecretRotatedResponseDto
    >
{
  constructor(
    private readonly endpointAuthorizationService: EndpointAuthorizationService,
    private readonly signingMaterial: EndpointSigningMaterialService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    command: RotateSigningSecretCommand,
  ): Promise<SigningSecretRotatedResponseDto> {
    await this.endpointAuthorizationService.getOwnedEndpoint(
      command.userId,
      command.endpointId,
    );

    return this.dataSource.transaction(async (manager) => {
      const endpoint = await manager
        .getRepository(EndpointEntity)
        .createQueryBuilder('endpoint')
        .setLock('pessimistic_write')
        .where('endpoint.id = :endpointId', {
          endpointId: command.endpointId,
        })
        .getOne();
      if (!endpoint) {
        throw new NotFoundException('Endpoint not found');
      }

      const issued = this.signingMaterial.issue(
        endpoint.signingSecretVersion + 1,
      );
      endpoint.signingSecretEncrypted = issued.signingSecretEncrypted;
      endpoint.signingSecretHash = issued.signingSecretHash;
      endpoint.signingSecretVersion = issued.signingSecretVersion;
      endpoint.signingSecretRotatedAt = issued.signingSecretRotatedAt;
      await manager.getRepository(EndpointEntity).save(endpoint);

      return {
        signingSecret: issued.signingSecret,
        version: issued.signingSecretVersion,
        rotatedAt: issued.signingSecretRotatedAt,
      };
    });
  }
}
