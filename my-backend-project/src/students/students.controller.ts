import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';
import { AuthUser } from '../auth/types/auth-user.type';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.create(dto, user.manv);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: AuthUser) {
    return this.studentsService.update(id, dto, user.manv);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.studentsService.remove(id, user.manv);
  }
}