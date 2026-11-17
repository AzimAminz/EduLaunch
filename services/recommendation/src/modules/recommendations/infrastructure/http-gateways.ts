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

  /** Every published programme at these levels: the catalogue pages 50 at a time, so all pages are read. */
  async programmesAt(levels: StudyLevel[]) {
    const PAGE_SIZE = 50;
    const MAX_PAGES = 200; // 10 000 programmes per level; a guard against a catalogue that never stops paging
    const perLevel = await Promise.all(
      levels.map(async (level) => {
        const out: ProgramSummary[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const { items } = await this.client.get(`/programmes?studyLevel=${level}&pageSize=${PAGE_SIZE}&page=${page}`, z.object({ items: z.array(ProgramSummary) }));
          out.push(...items);
          if (items.length < PAGE_SIZE) break;
        }
        return out;
      }),
    );
    return perLevel.flat();
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

  async fields() {
    const rows = await this.client.get('/fields', z.array(z.object({ id: z.string(), nameEn: z.string().nullable().default(null), riasecWeights: z.record(z.string(), z.number()).nullable() })));
    return rows.map((r) => ({ id: r.id, nameEn: r.nameEn, riasecWeights: r.riasecWeights as Riasec | null }));
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
