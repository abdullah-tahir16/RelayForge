export interface Endpoint {
  id: string;
  projectId: string;
  name: string;
  url: string;
  description: string | null;
  enabled: boolean;
  timeoutMs: number;
  signingSecretVersion: number;
  signingSecretRotatedAt: string;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EndpointCreated extends Endpoint {
  signingSecret: string;
}

export interface SigningSecretRotated {
  signingSecret: string;
  version: number;
  rotatedAt: string;
}

export interface EndpointLookupItem {
  id: string;
  name: string;
}

export interface EndpointFormValues {
  name: string;
  url: string;
  description?: string;
  timeoutMs?: number;
}
