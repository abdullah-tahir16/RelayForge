import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from '../entities/api-key.entity';

@Injectable()
export class ApiKeysRepository {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly repository: Repository<ApiKeyEntity>,
  ) {}

  findAllByProjectId(projectId: string): Promise<ApiKeyEntity[]> {
    return this.repository.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
  }

  findByIdInProject(
    id: string,
    projectId: string,
  ): Promise<ApiKeyEntity | null> {
    return this.repository.findOne({ where: { id, projectId } });
  }

  findById(id: string): Promise<ApiKeyEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
}
