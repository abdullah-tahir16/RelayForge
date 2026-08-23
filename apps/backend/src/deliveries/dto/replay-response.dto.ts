export type ReplayStartKind = 'started' | 'resumed';
export type ReplaySkipReason =
  | 'endpoint_disabled'
  | 'active_run'
  | 'not_eligible';

export interface ReplayDeliveryResponseDto {
  deliveryId: string;
  runId: string;
  runNumber: number;
  status: ReplayStartKind;
}

export interface ReplayEventItemDto extends ReplayDeliveryResponseDto {}

export interface ReplayEventSkippedDto {
  deliveryId: string;
  reason: ReplaySkipReason;
}

export interface ReplayEventPublicationFailedDto {
  deliveryId: string;
  runId: string;
  runNumber: number;
  reason: 'publication_failed';
}

export interface ReplayEventResponseDto {
  started: ReplayEventItemDto[];
  resumed: ReplayEventItemDto[];
  skipped: ReplayEventSkippedDto[];
  publicationFailed: ReplayEventPublicationFailedDto[];
}
