import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiKeyAuthGuard } from '../api-keys/guards/api-key-auth.guard';
import { CurrentApiKey } from '../api-keys/decorators/current-api-key.decorator';
import { ApiKeyContext } from '../api-keys/strategies/api-key.strategy';
import { CreateEventDto } from './dto/create-event.dto';
import { EventResponse } from './dto/event-response.dto';
import { IngestEventCommand } from './commands/impl/ingest-event.command';

@UseGuards(ApiKeyAuthGuard)
@Controller()
export class EventsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('api/v1/events')
  @HttpCode(HttpStatus.ACCEPTED)
  ingest(
    @CurrentApiKey() apiKey: ApiKeyContext,
    @Body() dto: CreateEventDto,
  ): Promise<EventResponse> {
    return this.commandBus.execute(
      new IngestEventCommand(
        apiKey.projectId,
        dto.event,
        dto.data,
        dto.metadata ?? null,
      ),
    );
  }
}
