import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ReplayDeliveryResponseDto } from '../../dto/replay-response.dto';
import { ReplayCoordinatorService } from '../../services/replay-coordinator.service';
import { ReplayDeliveryCommand } from '../impl/replay-delivery.command';

@CommandHandler(ReplayDeliveryCommand)
export class ReplayDeliveryHandler
  implements ICommandHandler<ReplayDeliveryCommand, ReplayDeliveryResponseDto>
{
  constructor(private readonly coordinator: ReplayCoordinatorService) {}

  execute(command: ReplayDeliveryCommand): Promise<ReplayDeliveryResponseDto> {
    return this.coordinator.replayDelivery(command.userId, command.deliveryId);
  }
}
