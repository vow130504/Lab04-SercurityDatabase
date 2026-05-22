import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
