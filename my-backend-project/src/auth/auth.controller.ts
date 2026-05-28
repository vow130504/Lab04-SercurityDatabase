import { Body, Controller, Post, Get, Put, Delete, Param, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from './types/auth-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @Get('salary') // Đổi thành Get, không cần body password
  @UseGuards(JwtAuthGuard)
  getSalary(@CurrentUser() user: AuthUser) {
    // Chỉ truyền MANV để lấy thông tin đã mã hóa
    return this.authService.getSalary(user.manv);
  }

  @Post('init-keys')
  @UseGuards(JwtAuthGuard)
  initKeys(@CurrentUser() user: AuthUser, @Body() payload: { luong: string; pubkey: string; enc_privkey: string }) {
    return this.authService.initKeys(user, payload);
  }

  @Post('employee')
  async createEmployee(@Body() body: any) {
    // Gọi SP tạo nhân viên
    return this.authService.createEmployee(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('employee')
  async getAllEmployees() {
    return this.authService.getAllEmployees();
  }

  @UseGuards(JwtAuthGuard)
  @Get('employee/:manv')
  async getEmployee(@Param('manv') manv: string, @CurrentUser() user: AuthUser) {
    return this.authService.getEmployee(manv, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('debug/employee/:manv')
  async debugEmployee(@Param('manv') manv: string, @CurrentUser() user: AuthUser) {
    return this.authService.debugEmployee(manv, user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('employee/:manv')
  async updateEmployee(@Param('manv') manv: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    return this.authService.updateEmployee(manv, body, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('employee/:manv')
  async deleteEmployee(@Param('manv') manv: string, @CurrentUser() user: AuthUser) {
    return this.authService.deleteEmployee(manv, user);
  }

  @Get('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@CurrentUser() user: AuthUser) {
    return this.authService.refresh(user);
  }
}
