import { All, Controller, Inject, Logger, NotFoundException, Req, Res } from '@nestjs/common';
import { InternalHeaders, type Caller } from '@edulaunch/nest-kit';
import type { Request, Response } from 'express';
import { JwtVerifier } from '../auth/jwt-verifier.js';
import { RouteTable } from './route-table.js';
import { ResponseCache } from './response-cache.js';

const FORWARDED_RESPONSE_HEADERS = ['content-type', 'cache-control', 'etag'];

/** Single public entry point. Verifies the session once, then forwards with internal headers. */
@Controller('api')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(
    private readonly routes: RouteTable,
    private readonly jwt: JwtVerifier,
    private readonly cache: ResponseCache,
    @Inject('INTERNAL_TOKEN') private readonly internalToken: string,
  ) {}

  @All('*path')
  async forward(@Req() req: Request, @Res() res: Response): Promise<void> {
    const match = this.routes.resolve(req.path);
    if (!match) throw new NotFoundException('No such API route');

    const bearer = req.header('authorization')?.match(/^Bearer (.+)$/)?.[1];
    const caller: Caller | null = bearer ? await this.jwt.verify(bearer) : null;

    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    const url = `${match.route.target}${match.upstreamPath}${query}`;
    const cacheable = req.method === 'GET' && !caller && match.route.cacheSeconds;
    const cacheKey = `${match.route.prefix}${match.upstreamPath}${query}`;

    if (cacheable) {
      const hit = await this.cache.get(cacheKey);
      if (hit) {
        res.status(hit.status).type(hit.contentType).setHeader('x-cache', 'HIT').send(hit.body);
        return;
      }
    }

    const headers: Record<string, string> = { [InternalHeaders.token]: this.internalToken, 'x-request-id': req.header('x-request-id') ?? crypto.randomUUID() };
    if (caller) Object.assign(headers, { [InternalHeaders.userId]: caller.userId, [InternalHeaders.role]: caller.role, [InternalHeaders.superAdmin]: String(!!caller.superAdmin) });
    const hasBody = !['GET', 'HEAD'].includes(req.method) && req.body !== undefined;
    if (hasBody) headers['content-type'] = 'application/json';

    let upstream: globalThis.Response;
    try {
      upstream = await fetch(url, { method: req.method, headers, body: hasBody ? JSON.stringify(req.body) : undefined, signal: AbortSignal.timeout(15_000) });
    } catch (err) {
      this.logger.error(`${req.method} ${url} failed: ${err instanceof Error ? err.message : String(err)}`);
      res.status(503).json({ code: 'service_unavailable', message: 'This part of EduLaunch is temporarily unavailable. Please try again shortly.' });
      return;
    }

    const body = await upstream.text();
    for (const h of FORWARDED_RESPONSE_HEADERS) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    if (cacheable && upstream.ok) {
      await this.cache.set(cacheKey, { status: upstream.status, contentType: upstream.headers.get('content-type') ?? 'application/json', body }, match.route.cacheSeconds!);
    }
    res.status(upstream.status).send(body);
  }
}
