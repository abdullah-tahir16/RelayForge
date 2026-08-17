import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectEntity } from './entities/project.entity';
import { ProjectsRepository } from './repositories/projects.repository';
import { ProjectSlugService } from './services/project-slug.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CreateProjectHandler } from './commands/handlers/create-project.handler';
import { UpdateProjectHandler } from './commands/handlers/update-project.handler';
import { DeleteProjectHandler } from './commands/handlers/delete-project.handler';
import { GetProjectsHandler } from './queries/handlers/get-projects.handler';
import { GetProjectHandler } from './queries/handlers/get-project.handler';

const commandHandlers = [
  CreateProjectHandler,
  UpdateProjectHandler,
  DeleteProjectHandler,
];
const queryHandlers = [GetProjectsHandler, GetProjectHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    WorkspacesModule,
    TypeOrmModule.forFeature([ProjectEntity]),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsRepository,
    ProjectSlugService,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [ProjectsRepository],
})
export class ProjectsModule {}
