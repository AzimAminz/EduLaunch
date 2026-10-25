import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException, createParamDecorator, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export type Role = 'student' | 'admin';

export interface Caller {
  userId: string;
  role: Role;
}

/** Headers the gateway sets after verifying the Supabase JWT. Services are never exposed directly. */
export const InternalHeaders = {
  token: 'x-internal-token',
  userId: 'x-user-id',
  role: 'x-user-role',
} as const;

const ROLES_KEY = 'edulaunch:roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const PUBLIC_KEY = 'edulaunch:public';
/** Route reachable without a signed-in user (still requires the internal token). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly internalToken: string,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { caller?: Caller }>();
    if (req.path === '/health') return true;

    const token = req.header(InternalHeaders.token) ?? '';
    if (!safeEqual(token, this.internalToken)) throw new UnauthorizedException('Requests must come through the gateway');

    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const userId = req.header(InternalHeaders.userId);
    const role = req.header(InternalHeaders.role) as Role | undefined;
    if (userId && (role === 'student' || role === 'admin')) req.caller = { userId, role };
    if (isPublic) return true;
    if (!req.caller) throw new UnauthorizedException('Sign in required');

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles && !roles.includes(req.caller.role)) throw new ForbiddenException('Not allowed for your role');
    return true;
  }
}

export const CurrentCaller = createParamDecorator((_: unknown, ctx: ExecutionContext): Caller | undefined => {
  return ctx.switchToHttp().getRequest<Request & { caller?: Caller }>().caller;
});
