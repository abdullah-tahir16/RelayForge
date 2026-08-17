import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspacesRepository } from '../repositories/workspaces.repository';

@Injectable()
export class WorkspacesService {
  constructor(private readonly workspacesRepository: WorkspacesRepository) {}

  async getWorkspaceIdForUser(userId: string): Promise<string> {
    const workspace = await this.workspacesRepository.findByOwnerUserId(userId);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace.id;
  }
}
