import { Injectable } from '@nestjs/common';
import { Database } from './common/database.service';

@Injectable()
export class AppService {
  constructor(private readonly db: Database) {}

  async health() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  }
}
