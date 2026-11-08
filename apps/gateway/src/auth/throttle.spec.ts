import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { Caller } from '@edulaunch/nest-kit';
import { LIMITS, callerOf, throttleOptions } from './throttle.js';

const admin: Caller = { userId: 'a1', role: 'admin', superAdmin: false };
const student: Caller = { userId: 's1', role: 'student', superAdmin: false };
const verify = vi.fn(async (token: string) => {
  if (token === 'admin') return admin;
  if (token === 'student') return student;
  throw new Error('bad token');
});
const req = (token?: string, ip = '127.0.0.1') => ({ ip, headers: token ? { authorization: `Bearer ${token}` } : {} });
const ctx = (r: object) => ({ switchToHttp: () => ({ getRequest: () => r }) }) as unknown as ExecutionContext;

describe('throttle', () => {
  const options = throttleOptions(verify);
  const throttler = (options as unknown as { throttlers: Array<{ limit: (c: ExecutionContext) => Promise<number> }> }).throttlers[0]!;
  const track = (options as unknown as { getTracker: (r: object) => Promise<string> }).getTracker;

  it('counts signed-in callers per account, so admins on one server do not share an allowance', async () => {
    expect(await track(req('admin'))).toBe('user:a1');
    expect(await track(req('student'))).toBe('user:s1');
  });

  it('counts visitors and bad tokens per address', async () => {
    expect(await track(req())).toBe('ip:127.0.0.1');
    expect(await track(req('forged', '10.0.0.9'))).toBe('ip:10.0.0.9');
  });

  it('gives admins room for a bulk import, students a fair share, visitors the smallest', async () => {
    expect(await throttler.limit(ctx(req('admin')))).toBe(LIMITS.admin);
    expect(await throttler.limit(ctx(req('student')))).toBe(LIMITS.student);
    expect(await throttler.limit(ctx(req()))).toBe(LIMITS.anonymous);
    expect(LIMITS.admin).toBeGreaterThan(48 * 15);
  });

  it('verifies a token once per request', async () => {
    verify.mockClear();
    const r = req('admin');
    await callerOf(r, verify);
    await callerOf(r, verify);
    expect(verify).toHaveBeenCalledTimes(1);
  });
});
