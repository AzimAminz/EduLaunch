import { DynamicModule, Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

export const DRIZZLE = Symbol('DRIZZLE');
const SQL_CLIENT = Symbol('SQL_CLIENT');

export type Database<TSchema extends Record<string, unknown>> = PostgresJsDatabase<TSchema>;

@Injectable()
class SqlClientCloser implements OnApplicationShutdown {
  constructor(@Inject(SQL_CLIENT) private readonly sql: Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end({ timeout: 5 });
  }
}

/** One connection pool per service. Each service only touches its own Postgres schema. */
@Global()
@Module({})
export class DatabaseModule {
  static forRoot<TSchema extends Record<string, unknown>>(options: { url: string; schema: TSchema; maxConnections?: number }): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        { provide: SQL_CLIENT, useFactory: () => postgres(options.url, { max: options.maxConnections ?? 5, prepare: false }) },
        { provide: DRIZZLE, inject: [SQL_CLIENT], useFactory: (sql: Sql) => drizzle(sql, { schema: options.schema }) },
        SqlClientCloser,
      ],
      exports: [DRIZZLE],
    };
  }
}
