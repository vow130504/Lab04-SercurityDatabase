import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';

type LoginRow = {
  MANV: string;
  HOTEN: string;
  EMAIL: string;
  TENDN: string;
  PUBKEY: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const rows = await this.databaseService.executeProcedure<LoginRow>(
      'SP_LOGIN_NHANVIEN',
      {
        MANV: payload.manv,
        MK: payload.matkhau,
      },
    );

    if (rows.length === 0) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu.');
    }

    const user = rows[0];

    const accessToken = await this.jwtService.signAsync({
      manv: user.MANV,
      hoten: user.HOTEN,
      tendn: user.TENDN,
    });

    return {
      accessToken,
      user: {
        manv: user.MANV,
        hoten: user.HOTEN,
        email: user.EMAIL,
        tendn: user.TENDN,
        pubkey: user.PUBKEY,
      },
    };
  }

  async getSalary(tendn: string, matkhau: string) {
    const rows = await this.databaseService.executeProcedure<{ LUONGCB: number }>(
      'SP_SEL_PUBLIC_NHANVIEN',
      {
        TENDN: tendn,
        MK: matkhau,
      },
    );

    if (rows.length === 0) {
      throw new UnauthorizedException('Mật khẩu không chính xác.');
    }

    return { luongcb: rows[0].LUONGCB };
  }
}
