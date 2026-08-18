export interface Endpoint {
  id: string;
  projectId: string;
  name: string;
  url: string;
  description: string | null;
  enabled: boolean;
  timeoutMs: number;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
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
