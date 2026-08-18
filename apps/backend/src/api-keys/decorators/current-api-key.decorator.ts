import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiKeyContext } from '../strategies/api-key.strategy';

export const CurrentApiKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyContext => {
    return ctx.switchToHttp().getRequest().user;
  },
);
