import { DeliveryAttemptEntity } from '../entities/delivery-attempt.entity';

export class DeliveryAttemptResponseDto {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  requestHeaders: Record<string, string> | null;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBodyPreview: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;

  static fromEntity(entity: DeliveryAttemptEntity): DeliveryAttemptResponseDto {
    return {
      id: entity.id,
      deliveryId: entity.deliveryId,
      attemptNumber: entity.attemptNumber,
      requestHeaders: entity.requestHeaders,
      responseStatus: entity.responseStatus,
      responseHeaders: entity.responseHeaders,
      responseBodyPreview: entity.responseBodyPreview,
      durationMs: entity.durationMs,
      errorCode: entity.errorCode,
      errorMessage: entity.errorMessage,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
    };
  }
}
