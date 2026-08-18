const SELECTED_PROJECT_STORAGE_KEY = 'relayforge.selectedProjectId';

export function getStoredProjectId(): string | null {
  return localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY);
}

export function storeProjectId(projectId: string): void {
  localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, projectId);
}
