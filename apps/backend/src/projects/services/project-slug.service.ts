import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ProjectsRepository } from '../repositories/projects.repository';

@Injectable()
export class ProjectSlugService {
  constructor(private readonly projectsRepository: ProjectsRepository) {}

  slugify(name: string): string {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'project';
  }

  async generateUniqueKey(
    workspaceId: string,
    name: string,
  ): Promise<string> {
    const base = this.slugify(name);
    let candidate = base;

    while (
      await this.projectsRepository.existsByWorkspaceIdAndKey(
        workspaceId,
        candidate,
      )
    ) {
      const suffix = randomBytes(2).toString('hex');
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }
}
