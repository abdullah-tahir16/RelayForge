import {
  DeliveryRunStatus,
  DeliveryRunTrigger,
} from '../entities/delivery-run.entity';

export interface DeliveryRunActorDto {
  id: string;
  email: string;
}

export class DeliveryRunResponseDto {
  id: string;
  deliveryId: string;
  runNumber: number;
  trigger: DeliveryRunTrigger;
  requestedBy: DeliveryRunActorDto | null;
  status: DeliveryRunStatus;
  attemptLimit: number | null;
  attemptCount: number;
  initialJobPublishedAt: Date | null;
  dlqPublishedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  deadLetteredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
