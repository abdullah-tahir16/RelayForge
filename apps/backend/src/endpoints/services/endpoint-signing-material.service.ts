import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  encryptSigningSecret,
  generateSigningSecret,
} from '@relayforge/webhook-signing';

export interface IssuedEndpointSigningMaterial {
  signingSecret: string;
  signingSecretEncrypted: string;
  signingSecretHash: string;
  signingSecretVersion: number;
  signingSecretRotatedAt: Date;
}

@Injectable()
export class EndpointSigningMaterialService {
  private readonly encryptionKey: Buffer;

  constructor(configService: ConfigService) {
    this.encryptionKey = configService.getOrThrow<Buffer>(
      'signing.encryptionKey',
    );
  }

  issue(version: number, now = new Date()): IssuedEndpointSigningMaterial {
    const generated = generateSigningSecret();
    return {
      signingSecret: generated.secret,
      signingSecretEncrypted: encryptSigningSecret(
        generated.secret,
        this.encryptionKey,
      ),
      signingSecretHash: generated.hash,
      signingSecretVersion: version,
      signingSecretRotatedAt: now,
    };
  }
}
