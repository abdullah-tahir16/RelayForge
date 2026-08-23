import { DataSourceOptions } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { WorkspaceEntity } from '../workspaces/entities/workspace.entity';
import { ProjectEntity } from '../projects/entities/project.entity';
import { ApiKeyEntity } from '../api-keys/entities/api-key.entity';
import { EndpointEntity } from '../endpoints/entities/endpoint.entity';
import { SubscriptionEntity } from '../subscriptions/entities/subscription.entity';
import { EventEntity } from '../events/entities/event.entity';
import { DeliveryEntity } from '../deliveries/entities/delivery.entity';
import { DeliveryAttemptEntity } from '../deliveries/entities/delivery-attempt.entity';
import { DeliveryRunEntity } from '../deliveries/entities/delivery-run.entity';

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
      EventEntity,
      DeliveryEntity,
      DeliveryRunEntity,
      DeliveryAttemptEntity,
    ],
    migrations: [__dirname + '/../migrations/[0-9]*{.ts,.js}'],
    synchronize: false,
  };
}
