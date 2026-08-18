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
import { ProjectEntity } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateProjectCommand } from './commands/impl/create-project.command';
import { UpdateProjectCommand } from './commands/impl/update-project.command';
import { DeleteProjectCommand } from './commands/impl/delete-project.command';
import { GetProjectsQuery } from './queries/impl/get-projects.query';
import { GetProjectQuery } from './queries/impl/get-project.query';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { PaginatedResponse } from '../common/pagination/paginated-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects')
export class ProjectsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectEntity> {
    return this.commandBus.execute(
      new CreateProjectCommand(user.id, dto.name, dto.description),
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: UserEntity,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<ProjectEntity>> {
    return this.queryBus.execute(
      new GetProjectsQuery(user.id, pagination.page, pagination.pageSize),
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<ProjectEntity> {
    return this.queryBus.execute(new GetProjectQuery(user.id, id));
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    return this.commandBus.execute(
      new UpdateProjectCommand(user.id, id, dto.name, dto.description),
    );
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<void> {
    return this.commandBus.execute(new DeleteProjectCommand(user.id, id));
  }
}
