import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { DatabaseService } from '../../database/database.service';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await this.jwtService.verifyAsync<AuthUser>(token);

      const rows = await this.databaseService.executeProcedure<{ VAITRO: boolean | number }>(
        'SP_SEL_NHANVIEN_BY_MANV',
        {
          MANV: payload.manv,
        },
      );

      if (!rows || rows.length === 0) {
        throw new UnauthorizedException('Tài khoản không còn tồn tại. Vui lòng đăng nhập lại.');
      }

      const roleInDb = Boolean(rows[0].VAITRO);
      if (roleInDb !== Boolean(payload.isadmin)) {
        throw new UnauthorizedException('Hệ thống ghi nhận quyền truy cập của tài khoản này vừa được thay đổi bởi quản trị viên. Để các thiết lập mới có hiệu lực và quá trình thực hiện công việc không bị gián đoạn, xin vui lòng đăng nhập lại hệ thống.');
      }

      (request as Request & { user: AuthUser }).user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
