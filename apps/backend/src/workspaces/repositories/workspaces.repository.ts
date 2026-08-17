import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceEntity } from '../entities/workspace.entity';

@Injectable()
export class WorkspacesRepository {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly repository: Repository<WorkspaceEntity>,
  ) {}

  findByOwnerUserId(ownerUserId: string): Promise<WorkspaceEntity | null> {
    return this.repository.findOne({ where: { ownerUserId } });
  }
}
