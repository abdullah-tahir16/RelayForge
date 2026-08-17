import { DataSourceOptions } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { WorkspaceEntity } from '../workspaces/entities/workspace.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ApiKeyEntity } from '../api-keys/entities/api-key.entity';
import { EndpointEntity } from '../endpoints/entities/endpoint.entity';
import { SubscriptionEntity } from '../subscriptions/entities/subscription.entity';

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [
      UserEntity,
      WorkspaceEntity,
      RefreshTokenEntity,
      ProjectEntity,
      ApiKeyEntity,
      EndpointEntity,
      SubscriptionEntity,
    ],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
  };
}
