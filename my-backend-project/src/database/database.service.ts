import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: sql.ConnectionPool | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config: sql.config = {
      server: this.configService.get<string>('DB_HOST', 'localhost'),
      port: Number(this.configService.get<string>('DB_PORT', '1433')),
      user: this.configService.get<string>('DB_USER', 'sa'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
      database: this.configService.get<string>('DB_NAME', 'QLSVNhom'),
      options: {
        encrypt: this.configService.get<string>('DB_ENCRYPT', 'false') === 'true',
        trustServerCertificate:
          this.configService.get<string>('DB_TRUST_SERVER_CERT', 'true') === 'true',
      },
    };

    this.pool = await new sql.ConnectionPool(config).connect();
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async executeProcedure<T>(
    procedureName: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    if (!this.pool) {
      throw new Error('SQL connection is not initialized.');
    }

    const request = this.pool.request();

    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value as never);
    });

    const result = await request.execute<T>(procedureName);
    return result.recordset ?? [];
  }
}
