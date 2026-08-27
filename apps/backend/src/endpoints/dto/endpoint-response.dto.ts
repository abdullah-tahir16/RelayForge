import { EndpointEntity } from '../entities/endpoint.entity';

export interface EndpointResponseDto {
  id: string;
  projectId: string;
  name: string;
  url: string;
  description: string | null;
  enabled: boolean;
  timeoutMs: number;
  signingSecretVersion: number;
  signingSecretRotatedAt: Date;
  disabledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EndpointCreatedResponseDto extends EndpointResponseDto {
  signingSecret: string;
}

export interface SigningSecretRotatedResponseDto {
  signingSecret: string;
  version: number;
  rotatedAt: Date;
}

export function toEndpointResponse(
  endpoint: EndpointEntity,
): EndpointResponseDto {
  return {
    id: endpoint.id,
    projectId: endpoint.projectId,
    name: endpoint.name,
    url: endpoint.url,
    description: endpoint.description,
    enabled: endpoint.enabled,
    timeoutMs: endpoint.timeoutMs,
    signingSecretVersion: endpoint.signingSecretVersion,
    signingSecretRotatedAt: endpoint.signingSecretRotatedAt,
    disabledAt: endpoint.disabledAt,
    createdAt: endpoint.createdAt,
    updatedAt: endpoint.updatedAt,
  };
}
