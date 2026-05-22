import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { DatabaseModule } from './database/database.module';
import { GradesModule } from './grades/grades.module';
import { StudentsModule } from './students/students.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    ClassesModule,
    GradesModule,
    StudentsModule,
  ],
})
export class AppModule {}
