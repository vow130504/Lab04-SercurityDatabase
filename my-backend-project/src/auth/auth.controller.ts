import { Body, Controller, Post, Get, Put, Delete, Param, UseGuards } from '@nestjs/common';import { AuthService } from './auth.service';
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

  @UseGuards(JwtAuthGuard)
  @Get('salary') // Đổi thành Get, không cần body password
  getSalary(@CurrentUser() user: AuthUser) {
    // Chỉ truyền MANV để lấy thông tin đã mã hóa
    return this.authService.getSalary(user.manv);
  }

  @UseGuards(JwtAuthGuard)
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
  @Put('employee/:manv')
  async updateEmployee(@Param('manv') manv: string, @Body() body: any) {
    return this.authService.updateEmployee(manv, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('employee/:manv')
  async deleteEmployee(@Param('manv') manv: string) {
    return this.authService.deleteEmployee(manv);
  }
}
