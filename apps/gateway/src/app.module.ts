import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from '@edulaunch/nest-kit';
import { env } from './config.js';
import { JwtVerifier } from './auth/jwt-verifier.js';
import { RouteTable } from './proxy/route-table.js';
import { ResponseCache } from './proxy/response-cache.js';
import { ProxyController } from './proxy/proxy.controller.js';

@Module({
  imports: [
    // Fair-use guard: generous per-IP limits; the Ask AI route gets its own tighter limit in the content service.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    HealthModule,
  ],
  controllers: [ProxyController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: JwtVerifier, useFactory: () => new JwtVerifier(env.SUPABASE_URL, env.SUPABASE_JWT_SECRET) },
    { provide: ResponseCache, useFactory: () => new ResponseCache(env.REDIS_URL) },
    {
      provide: RouteTable,
      useFactory: () =>
        new RouteTable([
          { prefix: '/api/catalogue', target: env.CATALOGUE_URL, cacheSeconds: 60 },
          { prefix: '/api/profile', target: env.PROFILE_URL },
          { prefix: '/api/recommendation', target: env.RECOMMENDATION_URL },
          { prefix: '/api/engagement', target: env.ENGAGEMENT_URL },
          { prefix: '/api/content', target: env.CONTENT_URL },
        ]),
    },
    { provide: 'INTERNAL_TOKEN', useValue: env.INTERNAL_TOKEN },
  ],
})
export class AppModule {}
