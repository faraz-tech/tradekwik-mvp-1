import { Global, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type pg from 'pg';
import { createDb, type Database } from './client.js';

/** Injection token for the Drizzle client: @Inject(DB) private readonly db: Database */
export const DB = Symbol('DB');

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  readonly db: Database;
  private readonly pool: pg.Pool;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('DATABASE_URL');
    const { db, pool } = createDb(url);
    this.db = db;
    this.pool = pool;
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    DrizzleService,
    {
      provide: DB,
      useFactory: (service: DrizzleService) => service.db,
      inject: [DrizzleService],
    },
  ],
  exports: [DB],
})
export class DbModule {}
