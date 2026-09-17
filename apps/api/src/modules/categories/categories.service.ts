import { Inject, Injectable } from '@nestjs/common';
import { asc } from 'drizzle-orm';
import type { CategoryDto } from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { categories } from '../../db/schema.js';
import { toCategoryDto } from '../../common/mappers.js';

@Injectable()
export class CategoriesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findAll(): Promise<CategoryDto[]> {
    const rows = await this.db.select().from(categories).orderBy(asc(categories.name));
    return rows.map(toCategoryDto);
  }
}
