import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { CreateEndpointDto } from './dto/create-endpoint.dto';
import { UpdateEndpointDto } from './dto/update-endpoint.dto';
import { EndpointLookupItem } from './dto/endpoint-lookup-item.dto';
import { RegisterEndpointCommand } from './commands/impl/register-endpoint.command';
import { UpdateEndpointCommand } from './commands/impl/update-endpoint.command';
import { EnableEndpointCommand } from './commands/impl/enable-endpoint.command';
import { DisableEndpointCommand } from './commands/impl/disable-endpoint.command';
import { DeleteEndpointCommand } from './commands/impl/delete-endpoint.command';
import { GetEndpointsQuery } from './queries/impl/get-endpoints.query';
import { GetEndpointQuery } from './queries/impl/get-endpoint.query';
import { GetEndpointsLookupQuery } from './queries/impl/get-endpoints-lookup.query';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { PaginatedResponse } from '../common/pagination/paginated-response.dto';
import {
  EndpointCreatedResponseDto,
  EndpointResponseDto,
  SigningSecretRotatedResponseDto,
} from './dto/endpoint-response.dto';
import { RotateSigningSecretCommand } from './commands/impl/rotate-signing-secret.command';

@UseGuards(JwtAuthGuard)
@Controller()
export class EndpointsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('api/v1/projects/:projectId/endpoints')
  register(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
    @Body() dto: CreateEndpointDto,
  ): Promise<EndpointCreatedResponseDto> {
    return this.commandBus.execute(
      new RegisterEndpointCommand(
        user.id,
        projectId,
        dto.name,
        dto.url,
        dto.description,
        dto.timeoutMs,
      ),
    );
  }

  @Get('api/v1/projects/:projectId/endpoints')
  findAll(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<EndpointResponseDto>> {
    return this.queryBus.execute(
      new GetEndpointsQuery(
        user.id,
        projectId,
        pagination.page,
        pagination.pageSize,
      ),
    );
  }

  @Get('api/v1/projects/:projectId/endpoints/lookup')
  findLookup(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
  ): Promise<EndpointLookupItem[]> {
    return this.queryBus.execute(
      new GetEndpointsLookupQuery(user.id, projectId),
    );
  }

  @Get('api/v1/endpoints/:id')
  findOne(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<EndpointResponseDto> {
    return this.queryBus.execute(new GetEndpointQuery(user.id, id));
  }

  @Patch('api/v1/endpoints/:id')
  update(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() dto: UpdateEndpointDto,
  ): Promise<EndpointResponseDto> {
    return this.commandBus.execute(
      new UpdateEndpointCommand(
        user.id,
        id,
        dto.name,
        dto.url,
        dto.description,
        dto.timeoutMs,
      ),
    );
  }

  @Post('api/v1/endpoints/:id/enable')
  enable(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<EndpointResponseDto> {
    return this.commandBus.execute(new EnableEndpointCommand(user.id, id));
  }

  @Post('api/v1/endpoints/:id/disable')
  disable(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<EndpointResponseDto> {
    return this.commandBus.execute(new DisableEndpointCommand(user.id, id));
  }

  @Post('api/v1/endpoints/:id/signing-secret/rotate')
  rotateSigningSecret(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<SigningSecretRotatedResponseDto> {
    return this.commandBus.execute(
      new RotateSigningSecretCommand(user.id, id),
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('api/v1/endpoints/:id')
  remove(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commandBus.execute(new DeleteEndpointCommand(user.id, id));
  }
}
