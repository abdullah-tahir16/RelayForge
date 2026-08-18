export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
