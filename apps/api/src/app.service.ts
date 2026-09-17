import { Injectable } from '@nestjs/common';
import { healthSchema, type HealthDto } from '@tradekwik/shared';

@Injectable()
export class AppService {
  getHealth(): HealthDto {
    return healthSchema.parse({
      status: 'ok',
      service: 'tradekwik-api',
      timestamp: new Date().toISOString(),
    });
  }
}
