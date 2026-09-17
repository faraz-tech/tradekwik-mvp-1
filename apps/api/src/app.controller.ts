import { Controller, Get } from '@nestjs/common';
import type { ApiResponse, HealthDto } from '@tradekwik/shared';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): ApiResponse<HealthDto> {
    return { data: this.appService.getHealth() };
  }

  @Get('health/db')
  async getDbStats(): Promise<ApiResponse<Record<string, number>>> {
    return { data: await this.appService.getDbStats() };
  }
}
