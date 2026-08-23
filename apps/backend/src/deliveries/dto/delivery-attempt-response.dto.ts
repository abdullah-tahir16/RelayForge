import { DeliveryAttemptEntity } from '../entities/delivery-attempt.entity';
import { DeliveryRunTrigger } from '../entities/delivery-run.entity';

export class DeliveryAttemptResponseDto {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  runId: string;
  runNumber: number;
  runTrigger: DeliveryRunTrigger;
  runAttemptNumber: number;
  requestHeaders: Record<string, string> | null;
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBodyPreview: string | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;

  static fromEntity(
    entity: DeliveryAttemptEntity,
    run?: { runNumber: number; trigger: DeliveryRunTrigger },
  ): DeliveryAttemptResponseDto {
    return {
      id: entity.id,
      deliveryId: entity.deliveryId,
      attemptNumber: entity.attemptNumber,
      runId: entity.runId,
      runNumber: run?.runNumber ?? 1,
      runTrigger: run?.trigger ?? DeliveryRunTrigger.INITIAL,
      runAttemptNumber: entity.runAttemptNumber,
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
