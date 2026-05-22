import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { GradesService } from './grades.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';

@Controller('grades')
@UseGuards(JwtAuthGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('hocphan')
  getAllHocPhan() {
    return this.gradesService.getAllHocPhan();
  }

  @Post('bangdiem')
  getBangDiem(
    @CurrentUser() user: AuthUser,
    @Body() payload: { malop: string; mahp: string; mk: string },
  ) {
    return this.gradesService.getBangDiem(user.manv, payload.malop, payload.mahp, payload.mk);
  }

  @Post('update')
  updateGrade(
    @CurrentUser() user: AuthUser,
    @Body() payload: { masv: string; mahp: string; diemthi: number },
  ) {
    return this.gradesService.updateGrade(user.manv, payload.masv, payload.mahp, payload.diemthi);
  }
}

