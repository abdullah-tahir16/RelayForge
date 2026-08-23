import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ReplayEventResponseDto } from '../../dto/replay-response.dto';
import { ReplayCoordinatorService } from '../../services/replay-coordinator.service';
import { ReplayEventCommand } from '../impl/replay-event.command';

@CommandHandler(ReplayEventCommand)
export class ReplayEventHandler
  implements ICommandHandler<ReplayEventCommand, ReplayEventResponseDto>
{
  constructor(private readonly coordinator: ReplayCoordinatorService) {}

  execute(command: ReplayEventCommand): Promise<ReplayEventResponseDto> {
    return this.coordinator.replayEvent(command.userId, command.eventId);
  }
}
