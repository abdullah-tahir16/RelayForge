import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceEntity } from './entities/workspace.entity';
import { WorkspacesRepository } from './repositories/workspaces.repository';
import { WorkspacesService } from './services/workspaces.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceEntity])],
  providers: [WorkspacesRepository, WorkspacesService],
  exports: [WorkspacesRepository, WorkspacesService],
})
export class WorkspacesModule {}
