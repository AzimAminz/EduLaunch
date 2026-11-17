import { Logger, type OnModuleInit } from '@nestjs/common';
import { resolve } from 'node:path';
import { TextEmbedder } from '../application/ports.js';

type Pipeline = (texts: string[], options: { pooling: 'mean'; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

/**
 * Sentence embeddings with transformers.js: a small multilingual model (about 120 MB) downloaded once into the
 * models folder and run on the CPU here, so nothing leaves the server and nothing is paid for. Vectors are kept in
 * memory per text, so the catalogue is embedded once per process. When the model cannot be loaded (offline on first
 * start, unsupported machine) every call answers null and recommendations go on without it.
 */
export class TransformersEmbedder extends TextEmbedder implements OnModuleInit {
  private readonly log = new Logger(TransformersEmbedder.name);
  private readonly vectors = new Map<string, number[]>();
  private loading: Promise<Pipeline | null> | null = null;

  constructor(private readonly options: { enabled: boolean; modelsDir: string; model: string }) {
    super();
  }

  /** Starts the (possibly long) first download as soon as the service starts, instead of on the first student. */
  onModuleInit() {
    if (this.options.enabled) void this.pipeline();
  }

  async similarity(query: string, passages: string[]): Promise<number[] | null> {
    if (!this.options.enabled || passages.length === 0) return null;
    const pipe = await this.pipeline();
    if (!pipe) return null;
    // E5 models expect these prefixes: the query is the student's text, the passages the catalogue's.
    const [q, ...p] = await this.embed(pipe, [`query: ${query}`, ...passages.map((x) => `passage: ${x}`)]);
    return p.map((v) => v.reduce((s, x, i) => s + x * q![i]!, 0));
  }

  private async embed(pipe: Pipeline, texts: string[]): Promise<number[][]> {
    const missing = [...new Set(texts.filter((t) => !this.vectors.has(t)))];
    if (missing.length) {
      const rows = (await pipe(missing, { pooling: 'mean', normalize: true })).tolist();
      missing.forEach((t, i) => this.vectors.set(t, rows[i]!));
    }
    return texts.map((t) => this.vectors.get(t)!);
  }

  private pipeline(): Promise<Pipeline | null> {
    this.loading ??= this.load().catch((error: unknown) => {
      this.log.warn(`Text model ${this.options.model} is not available, so programme names are not compared (field matching only): ${String(error)}`);
      return null;
    });
    return this.loading;
  }

  private async load(): Promise<Pipeline> {
    const { env, pipeline } = await import('@huggingface/transformers');
    env.cacheDir = resolve(this.options.modelsDir);
    const started = Date.now();
    this.log.log(`Loading text model ${this.options.model} from ${env.cacheDir} (downloaded once, about 120 MB)`);
    const pipe = (await pipeline('feature-extraction', this.options.model, { dtype: 'q8' })) as unknown as Pipeline;
    this.log.log(`Text model ready in ${Date.now() - started} ms`);
    return pipe;
  }
}
