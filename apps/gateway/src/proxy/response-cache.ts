import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

export interface CachedResponse {
  status: number;
  contentType: string;
  body: string;
}

/** Short-lived cache for anonymous catalogue reads. A no-op when Redis is not configured. */
@Injectable()
export class ResponseCache implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ResponseCache.name);
  private client?: RedisClientType;

  constructor(private readonly url?: string) {}

  async onModuleInit() {
    if (!this.url) return;
    this.client = createClient({ url: this.url });
    this.client.on('error', (err: Error) => this.logger.warn(`Redis: ${err.message}`));
    await this.client.connect();
  }

  async get(key: string): Promise<CachedResponse | null> {
    if (!this.client?.isReady) return null;
    const raw = await this.client.get(`gw:${key}`);
    return raw ? (JSON.parse(raw) as CachedResponse) : null;
  }

  async set(key: string, value: CachedResponse, seconds: number): Promise<void> {
    if (!this.client?.isReady) return;
    await this.client.set(`gw:${key}`, JSON.stringify(value), { EX: seconds });
  }

  async onApplicationShutdown() {
    await this.client?.quit();
  }
}
