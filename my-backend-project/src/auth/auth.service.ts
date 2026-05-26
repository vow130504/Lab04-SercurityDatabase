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

  // Cập nhật lại hàm getSalary
  async getSalary(manv: string) {
    // Gọi Stored Procedure vừa tạo
    const rows = await this.databaseService.executeProcedure<{ LUONG_ENC: string }>(
      'SP_GET_LUONG_ENCRYPT_NHANVIEN',
      {
        MANV: manv,
      }
    );

    if (rows.length === 0) {
      throw new UnauthorizedException('Không tìm thấy thông tin nhân viên.');
    }

    return { luongEncrypted: rows[0].LUONG_ENC };
  }

  async createEmployee(payload: any) {
    await this.databaseService.executeProcedure(
      'SP_INS_PUBLIC_ENCRYPT_NHANVIEN',
      {
        MANV: payload.MANV,
        HOTEN: payload.HOTEN,
        EMAIL: payload.EMAIL,
        LUONG: payload.LUONG, // Chuỗi RSA Base64
        TENDN: payload.TENDN,
        MK: payload.MK,       // Chuỗi SHA1 Hex
        PUB: payload.PUBKEY
      }
    );
    return { success: true };
  }


  async getAllEmployees() {
    return this.databaseService.executeProcedure('SP_SEL_ALL_NHANVIEN', {});
  }

  async updateEmployee(manv: string, payload: { HOTEN: string; EMAIL: string }) {
    await this.databaseService.executeProcedure('SP_UPD_NHANVIEN', {
      MANV: manv,
      HOTEN: payload.HOTEN,
      EMAIL: payload.EMAIL,
    });
    return { success: true };
  }

  async deleteEmployee(manv: string) {
    await this.databaseService.executeProcedure('SP_DEL_NHANVIEN', {
      MANV: manv,
    });
    return { success: true };
  }
}
