import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/types/auth-user.type';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  getAll() {
    return this.classesService.getAllClasses();
  }

  @Get('mine')
  getMine(@CurrentUser() user: AuthUser) {
    return this.classesService.getManagedClasses(user.manv);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() payload: CreateClassDto) {
    return this.classesService.createClass(user.manv, payload);
  }

  @Patch(':malop')
  update(
    @CurrentUser() user: AuthUser,
    @Param('malop') malop: string,
    @Body() payload: UpdateClassDto,
  ) {
    return this.classesService.updateClass(user.manv, malop, payload);
  }

  @Get(':malop/students')
  getStudents(@CurrentUser() user: AuthUser, @Param('malop') malop: string) {
    return this.classesService.getStudentsByClass(user.manv, malop);
  }

  @Delete(':malop')
  delete(@CurrentUser() user: AuthUser, @Param('malop') malop: string) {
    return this.classesService.deleteClass(user.manv, malop);
  }
}
