import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Pulls req.user (set by JwtStrategy.validate) into a handler parameter:
//   me(@CurrentUser() user: AccessTokenPayload) {...}
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: unknown }>();
    return request.user;
  },
);
