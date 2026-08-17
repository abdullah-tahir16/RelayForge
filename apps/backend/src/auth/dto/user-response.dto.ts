import { UserEntity } from '../entities/user.entity';
import { WorkspaceEntity } from '../entities/workspace.entity';

export interface WorkspaceResponse {
  id: string;
  name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  createdAt: Date;
  workspace?: WorkspaceResponse;
}

export function toWorkspaceResponse(
  workspace: WorkspaceEntity,
): WorkspaceResponse {
  return { id: workspace.id, name: workspace.name };
}

export function toUserResponse(
  user: UserEntity,
  workspace?: WorkspaceEntity,
): UserResponse {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    ...(workspace ? { workspace: toWorkspaceResponse(workspace) } : {}),
  };
}
