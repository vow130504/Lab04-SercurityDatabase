import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}