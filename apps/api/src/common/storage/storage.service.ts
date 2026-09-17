import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StoredFile {
  url: string;
}

/**
 * Storage abstraction — local disk in dev.
 * A Cloudflare R2/S3 adapter later implements the same interface and is
 * swapped in the DI provider; callers do not change.
 */
export abstract class StorageService {
  abstract save(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFile>;
}

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly uploadsDir: string;
  private readonly publicBase: string;

  constructor(config: ConfigService) {
    super();
    this.uploadsDir = path.resolve(config.get<string>('UPLOADS_DIR') ?? './uploads');
    this.publicBase = config.get<string>('API_PUBLIC_URL') ?? 'http://localhost:4000';
  }

  async save(buffer: Buffer, originalName: string, _mimeType: string): Promise<StoredFile> {
    const ext = path.extname(originalName).toLowerCase().slice(0, 10) || '.bin';
    const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
    await mkdir(this.uploadsDir, { recursive: true });
    await writeFile(path.join(this.uploadsDir, name), buffer);
    return { url: `${this.publicBase}/uploads/${name}` };
  }
}
