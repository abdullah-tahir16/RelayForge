import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../entities/project.entity';

@Injectable()
export class ProjectsRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repository: Repository<ProjectEntity>,
  ) {}

  findAllByWorkspaceId(workspaceId: string): Promise<ProjectEntity[]> {
    return this.repository.find({ where: { workspaceId } });
  }

  findByIdInWorkspace(
    id: string,
    workspaceId: string,
  ): Promise<ProjectEntity | null> {
    return this.repository.findOne({ where: { id, workspaceId } });
  }

  existsByWorkspaceIdAndKey(
    workspaceId: string,
    key: string,
  ): Promise<boolean> {
    return this.repository.exists({ where: { workspaceId, key } });
  }
}
