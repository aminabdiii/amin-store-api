import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Database } from '../common/database';
import { ApiRequest, fail } from '../common/http';
import { configuration } from '../common/config';
export const Public = () => SetMetadata('public', true);
export const Admin = () => SetMetadata('admin', true);
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<ApiRequest>().user!,
);
export type Principal = NonNullable<ApiRequest['user']>;
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: Database,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const req = context.switchToHttp().getRequest<ApiRequest>();
    const token = req.headers.authorization;
    if (!token?.startsWith('Bearer ')) fail(401, 'UNAUTHORIZED', 'Authentication required');
    let payload: JwtPayload;
    try {
      const decoded = jwt.verify(token.slice(7), configuration().jwtSecret, {
        algorithms: ['HS256'],
        audience: 'amin-store-api',
        issuer: 'amin-store-api',
      });
      if (typeof decoded === 'string') throw new Error();
      payload = decoded;
    } catch {
      fail(401, 'INVALID_TOKEN', 'Invalid or expired access token');
    }
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(payload.sid)
    )
      fail(401, 'INVALID_TOKEN', 'Invalid token claims');
    const session = await this.db.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active
    )
      fail(401, 'SESSION_EXPIRED', 'Session is no longer active');
    req.user = { id: session.userId, role: session.user.role, sessionId: session.id };
    if (
      this.reflector.getAllAndOverride<boolean>('admin', [
        context.getHandler(),
        context.getClass(),
      ]) &&
      session.user.role !== 'ADMIN'
    )
      fail(403, 'FORBIDDEN', 'Administrator access required');
    return true;
  }
}
