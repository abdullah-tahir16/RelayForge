import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { GenerateApiKeyDto } from './dto/generate-api-key.dto';
import {
  ApiKeyCreatedResponse,
  ApiKeyResponse,
} from './dto/api-key-response.dto';
import { GenerateApiKeyCommand } from './commands/impl/generate-api-key.command';
import { RevokeApiKeyCommand } from './commands/impl/revoke-api-key.command';
import { GetApiKeysQuery } from './queries/impl/get-api-keys.query';

@UseGuards(JwtAuthGuard)
@Controller()
export class ApiKeysController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('api/v1/projects/:projectId/api-keys')
  generate(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
    @Body() dto: GenerateApiKeyDto,
  ): Promise<ApiKeyCreatedResponse> {
    return this.commandBus.execute(
      new GenerateApiKeyCommand(user.id, projectId, dto.name),
    );
  }

  @Get('api/v1/projects/:projectId/api-keys')
  findAll(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
  ): Promise<ApiKeyResponse[]> {
    return this.queryBus.execute(new GetApiKeysQuery(user.id, projectId));
  }

  @Delete('api/v1/api-keys/:id')
  revoke(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<ApiKeyResponse> {
    return this.commandBus.execute(new RevokeApiKeyCommand(user.id, id));
  }
}
