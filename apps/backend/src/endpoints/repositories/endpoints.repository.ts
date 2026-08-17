import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EndpointEntity } from '../entities/endpoint.entity';

@Injectable()
export class EndpointsRepository {
  constructor(
    @InjectRepository(EndpointEntity)
    private readonly repository: Repository<EndpointEntity>,
  ) {}

  findAllByProjectId(projectId: string): Promise<EndpointEntity[]> {
    return this.repository.find({ where: { projectId } });
  }

  findByIdInProject(
    id: string,
    projectId: string,
  ): Promise<EndpointEntity | null> {
    return this.repository.findOne({ where: { id, projectId } });
  }

  findById(id: string): Promise<EndpointEntity | null> {
    return this.repository.findOne({ where: { id } });
  }
}
