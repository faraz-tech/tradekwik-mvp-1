import { Inject, Injectable } from '@nestjs/common';
import { count } from 'drizzle-orm';
import { healthSchema, type HealthDto } from '@tradekwik/shared';
import { DB } from './db/db.module.js';
import type { Database } from './db/client.js';
import {
  categories,
  inquiries,
  orderRequests,
  platformAdmins,
  products,
  sellerUsers,
  sellers,
} from './db/schema.js';

@Injectable()
export class AppService {
  constructor(@Inject(DB) private readonly db: Database) {}

  getHealth(): HealthDto {
    return healthSchema.parse({
      status: 'ok',
      service: 'tradekwik-api',
      timestamp: new Date().toISOString(),
    });
  }

  /** Dev sanity check: row counts per table, proves migrations + seed ran. */
  async getDbStats(): Promise<Record<string, number>> {
    const tables = {
      categories,
      sellers,
      sellerUsers,
      platformAdmins,
      products,
      inquiries,
      orderRequests,
    } as const;

    const entries = await Promise.all(
      Object.entries(tables).map(async ([name, table]) => {
        const [row] = await this.db.select({ value: count() }).from(table);
        return [name, row.value] as const;
      }),
    );
    return Object.fromEntries(entries);
  }
}
