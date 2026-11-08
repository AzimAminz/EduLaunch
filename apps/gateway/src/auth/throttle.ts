import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Caller } from '@edulaunch/nest-kit';

/**
 * Requests a minute. Signed-in callers are counted per account, visitors per address: every page the web app renders
 * calls the gateway from the same server address, so counting by address alone made all admins share one small
 * allowance, and a single import (a dozen calls per programme) ran out of it part way through.
 */
export const LIMITS = { anonymous: 120, student: 600, admin: 3000 } as const;

type Verify = (token: string) => Promise<Caller>;
const CALLER = Symbol('throttle caller');

/** The verified caller of a request, or null for a visitor (no token, or one that does not verify). Read once per request. */
export async function callerOf(req: Record<string | symbol, unknown>, verify: Verify): Promise<Caller | null> {
  if (CALLER in req) return req[CALLER] as Caller | null;
  const header = (req.headers as Record<string, string | undefined> | undefined)?.authorization;
  const bearer = header?.match(/^Bearer (.+)$/)?.[1];
  const caller = bearer ? await verify(bearer).catch(() => null) : null;
  req[CALLER] = caller;
  return caller;
}

/** Rate limits per account for signed-in callers (generous for admins, who import in bulk) and per address otherwise. */
export function throttleOptions(verify: Verify): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: 60_000,
        limit: async (context: ExecutionContext) => {
          const caller = await callerOf(context.switchToHttp().getRequest(), verify);
          return LIMITS[caller?.role ?? 'anonymous'];
        },
      },
    ],
    getTracker: async (req: Record<string, unknown>) => {
      const caller = await callerOf(req, verify);
      return caller ? `user:${caller.userId}` : `ip:${String(req.ip ?? '')}`;
    },
  };
}
