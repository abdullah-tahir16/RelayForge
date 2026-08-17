import { ProjectSlugService } from './project-slug.service';

describe('ProjectSlugService', () => {
  function buildService(existsResults: boolean[]) {
    const projectsRepository = {
      existsByWorkspaceIdAndKey: jest
        .fn()
        .mockImplementation(() => Promise.resolve(existsResults.shift())),
    };
    return {
      service: new ProjectSlugService(projectsRepository as any),
      projectsRepository,
    };
  }

  it('slugifies a simple name to kebab-case', () => {
    const { service } = buildService([]);
    expect(service.slugify('E-Commerce')).toBe('e-commerce');
    expect(service.slugify('Billing & Invoicing')).toBe('billing-invoicing');
    expect(service.slugify('  Mobile Backend  ')).toBe('mobile-backend');
  });

  it('falls back to a default slug for a name with no alphanumeric characters', () => {
    const { service } = buildService([]);
    expect(service.slugify('***')).toBe('project');
  });

  it('returns the base slug when it is not already taken', async () => {
    const { service, projectsRepository } = buildService([false]);
    const key = await service.generateUniqueKey('workspace-1', 'E-Commerce');
    expect(key).toBe('e-commerce');
    expect(projectsRepository.existsByWorkspaceIdAndKey).toHaveBeenCalledWith(
      'workspace-1',
      'e-commerce',
    );
  });

  it('disambiguates with a random suffix when the base slug collides', async () => {
    const { service } = buildService([true, false]);
    const key = await service.generateUniqueKey('workspace-1', 'E-Commerce');
    expect(key).toMatch(/^e-commerce-[0-9a-f]{4}$/);
  });

  it('keeps retrying with a new suffix until a free slug is found', async () => {
    const { service } = buildService([true, true, false]);
    const key = await service.generateUniqueKey('workspace-1', 'E-Commerce');
    expect(key).toMatch(/^e-commerce-[0-9a-f]{4}$/);
  });
});
