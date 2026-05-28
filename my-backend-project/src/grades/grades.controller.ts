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

  /**
   * Lab 4: Lấy danh sách điểm ở dạng mã hóa (Base64).
   * Client sẽ dùng Private Key để giải mã và hiển thị.
   */
  @Post('bangdiem')
  getBangDiem(
    @CurrentUser() user: AuthUser,
    @Body() payload: { malop: string; mahp: string },
  ) {
    return this.gradesService.getBangDiem(user.manv, payload.malop, payload.mahp);
  }

  /**
   * Lab 4: Lưu điểm đã được mã hóa RSA từ trình duyệt.
   * Backend chỉ nhận và lưu chuỗi mã hóa, KHÔNG xử lý thêm.
   */
  @Post('update')
  updateGrade(
    @CurrentUser() user: AuthUser,
    @Body() payload: { masv: string; mahp: string; diemthiEnc: string },
  ) {
    return this.gradesService.updateGrade(user.manv, payload.masv, payload.mahp, payload.diemthiEnc);
  }

  /**
   * Lab 4: Lấy Public Key của nhân viên đang đăng nhập (dạng PEM string).
   */
  @Get('pubkey')
  getPublicKey(@CurrentUser() user: AuthUser) {
    return this.gradesService.getPublicKey(user.manv);
  }

  /**
   * Lab 4: Cập nhật Public Key mới khi nhân viên tạo cặp khóa từ giao diện.
   */
  @Post('update-pubkey')
  updatePublicKey(
    @CurrentUser() user: AuthUser,
    @Body() payload: { pubkey: string },
  ) {
    return this.gradesService.updatePublicKey(user.manv, payload.pubkey);
  }
}


