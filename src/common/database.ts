import { Global, Injectable, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { configuration } from './config';
import { isTransactionConflict } from './prisma-errors';

@Injectable()
export class Database extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const config = configuration();
    super({
      adapter: new PrismaPg({
        connectionString: config.databaseUrl,
        max: config.poolMax,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }),
    });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
  async transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.$transaction(operation, {
          isolationLevel: 'Serializable',
          maxWait: 5_000,
          timeout: 15_000,
        });
      } catch (error) {
        if (!isTransactionConflict(error) || attempt >= 2) throw error;
      }
    }
  }
}
@Global()
@Module({ providers: [Database], exports: [Database] })
export class DatabaseModule {}
