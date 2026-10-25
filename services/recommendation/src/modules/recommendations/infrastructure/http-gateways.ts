import { Injectable, Logger } from '@nestjs/common';
import { InternalHeaders, type Caller } from '@edulaunch/nest-kit';
import { ProgramSummary, PublishedRequirement, StudentSnapshot, type StudyLevel } from '@edulaunch/contracts';
import { z } from 'zod';
import { CatalogueGateway, ProfileGateway } from '../application/ports.js';
import type { Riasec } from '../domain/scoring.js';

/** Small HTTP client: internal token on every call, typed responses validated with zod. */
class ServiceClient {
  private readonly logger = new Logger(ServiceClient.name);

  constructor(
    private readonly baseUrl: string,
    private readonly internalToken: string,
  ) {}

  async get<T extends z.ZodType>(path: string, schema: T, caller?: Caller): Promise<z.infer<T>> {
    const headers: Record<string, string> = { [InternalHeaders.token]: this.internalToken };
    if (caller) Object.assign(headers, { [InternalHeaders.userId]: caller.userId, [InternalHeaders.role]: caller.role });
    const res = await fetch(new URL(path, this.baseUrl), { headers, signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      this.logger.warn(`GET ${path} → ${res.status}`);
      throw new Error(`Upstream ${new URL(this.baseUrl).host} returned ${res.status}`);
    }
    return schema.parse(await res.json());
  }
}

@Injectable()
export class HttpCatalogueGateway extends CatalogueGateway {
  private readonly client: ServiceClient;

  constructor(baseUrl: string, internalToken: string) {
    super();
    this.client = new ServiceClient(baseUrl, internalToken);
  }

  async programmesAt(levels: StudyLevel[]) {
    const pages = await Promise.all(
      levels.map((l) => this.client.get(`/programmes?studyLevel=${l}&pageSize=50`, z.object({ items: z.array(ProgramSummary) }))),
    );
    return pages.flatMap((p) => p.items);
  }

  async publishedRequirements(programIds: string[]) {
    if (!programIds.length) return [];
    const out: PublishedRequirement[] = [];
    for (let i = 0; i < programIds.length; i += 100) {
      const ids = programIds.slice(i, i + 100).join(',');
      out.push(...(await this.client.get(`/requirements/published?programIds=${ids}`, z.array(PublishedRequirement))));
    }
    return out;
  }

  async subjectNames() {
    const rows = await this.client.get('/subjects', z.array(z.object({ id: z.string(), name: z.string() })));
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  async fieldWeights() {
    const rows = await this.client.get('/fields', z.array(z.object({ id: z.string(), riasecWeights: z.record(z.string(), z.number()).nullable() })));
    return new Map(rows.map((r) => [r.id, r.riasecWeights as Riasec | null]));
  }
}

@Injectable()
export class HttpProfileGateway extends ProfileGateway {
  private readonly client: ServiceClient;

  constructor(baseUrl: string, internalToken: string) {
    super();
    this.client = new ServiceClient(baseUrl, internalToken);
  }

  async studentIdFor(caller: Caller) {
    return (await this.client.get('/me', z.object({ studentId: z.uuid() }), caller)).studentId;
  }

  snapshot(studentId: string) {
    return this.client.get(`/internal/students/${studentId}/snapshot`, StudentSnapshot);
  }
}
