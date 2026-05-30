import { Injectable, ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './types/auth-user.type';

type LoginRow = {
  MANV: string;
  HOTEN: string;
  EMAIL: string;
  TENDN: string;
  PUBKEY: string;
  VAITRO: boolean | number;
  ENC_PRIVKEY: string | null;
};

type EmployeeRow = {
  MANV: string;
  HOTEN: string;
  EMAIL: string;
  TENDN: string;
  LUONG: string | null;
  PUBKEY: string | null;
  VAITRO: boolean | number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    // [Lab 4] Đăng nhập bằng MANV + MATKHAU theo yêu cầu đề bài
    // SP_LOGIN_NHANVIEN: WHERE MANV = @MANV AND MATKHAU = CONVERT(VARBINARY, @MK, 2)
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
    const isAdmin = Boolean(user.VAITRO);

    const accessToken = await this.jwtService.signAsync({
      manv: user.MANV,
      hoten: user.HOTEN,
      tendn: user.TENDN,
      isadmin: isAdmin,
    });

    return {
      accessToken,
      user: {
        manv: user.MANV,
        hoten: user.HOTEN,
        email: user.EMAIL,
        tendn: user.TENDN,
        pubkey: user.PUBKEY,
        isadmin: isAdmin,
        enc_privkey: user.ENC_PRIVKEY ?? null,
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

  async initKeys(user: AuthUser, payload: { luong: string; pubkey: string; enc_privkey: string }) {
    try {
      const safePubKey = payload.pubkey.replace(/'/g, "''");
      const safePrivKey = payload.enc_privkey.replace(/'/g, "''");
      const luongBuf = payload.luong ? Buffer.from(payload.luong, 'utf8') : Buffer.from('0');
      // luongBuf needs to be converted to hex to insert as varbinary
      const luongHex = luongBuf.toString('hex');
      
      await this.databaseService.query(
        `UPDATE NHANVIEN SET PUBKEY = '${safePubKey}', ENC_PRIVKEY = '${safePrivKey}', LUONG = 0x${luongHex} WHERE MANV = '${user.manv}'`
      );
      return { success: true };
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  async createEmployee(payload: any) {
    try {
      const rows = await this.databaseService.executeProcedure<{ MANV: string }>(
        'SP_INS_PUBLIC_ENCRYPT_NHANVIEN',
        {
          MANV: payload.MANV ?? null,
          HOTEN: payload.HOTEN,
          EMAIL: payload.EMAIL,
          LUONG: payload.LUONG ? Buffer.from(payload.LUONG, 'utf8') : Buffer.from('0'),
          TENDN: payload.TENDN,
          MK: payload.MK,
          PUB: payload.PUBKEY ?? '',
        }
      );

      const createdManv = rows && rows.length > 0 ? rows[0].MANV : null;
      
      // [Lab 4] Lưu ENC_PRIVKEY (Private Key đã mã hóa AES từ client)
      // KHÔNG dùng raw SQL nối chuỗi trực tiếp để tránh SQL Injection
      if (createdManv && payload.ENC_PRIVKEY) {
        const safePrivKey = payload.ENC_PRIVKEY.replace(/'/g, "''");
        await this.databaseService.query(
          `UPDATE NHANVIEN SET ENC_PRIVKEY = '${safePrivKey}' WHERE MANV = '${createdManv}'`
        );
      }
      
      return { success: true, manv: createdManv };
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Lỗi khi tạo nhân viên');
    }
  }


  async getAllEmployees() {
    const rows = await this.databaseService.executeProcedure<{
      MANV: string;
      HOTEN: string;
      EMAIL: string;
      TENDN: string;
      VAITRO: boolean | number;
    }>('SP_SEL_ALL_NHANVIEN', {});

    return rows.map((row) => ({
      manv: row.MANV,
      hoten: row.HOTEN,
      email: row.EMAIL,
      tendn: row.TENDN,
      isadmin: Boolean(row.VAITRO),
    }));
  }

  async getEmployee(manv: string, currentUser: AuthUser) {
    if (!currentUser.isadmin && currentUser.manv !== manv) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin nhân viên này.');
    }

    const rows = await this.databaseService.executeProcedure<EmployeeRow>(
      'SP_SEL_NHANVIEN_BY_MANV',
      {
        MANV: manv,
      },
    );

    if (rows.length === 0) {
      throw new UnauthorizedException('Không tìm thấy thông tin nhân viên.');
    }

    const row = rows[0];

    return {
      manv: row.MANV,
      hoten: row.HOTEN,
      email: row.EMAIL,
      tendn: row.TENDN,
      luong: row.LUONG && Buffer.isBuffer(row.LUONG) ? (row.LUONG as Buffer).toString('utf8') : row.LUONG,
      pubkey: row.PUBKEY,
      isadmin: Boolean(row.VAITRO),
    };
  }

  private assertAdmin(user: AuthUser) {
    if (!user.isadmin) {
      throw new ForbiddenException('Chỉ quản trị viên mới được thực hiện thao tác này.');
    }
  }

  async updateEmployee(
    manv: string,
    payload: { HOTEN: string; EMAIL: string; LUONG?: string; VAITRO?: boolean; TENDN?: string },
    currentUser: AuthUser,
  ) {
    this.assertAdmin(currentUser);

    if (typeof payload.TENDN !== 'undefined') {
      throw new ForbiddenException('Không được phép chỉnh sửa tên đăng nhập.');
    }

    if (currentUser.manv === manv && currentUser.isadmin && payload.VAITRO === false) {
      throw new ForbiddenException('Bạn không thể tự thu hồi quyền admin của chính mình.');
    }

    await this.databaseService.executeProcedure('SP_UPD_NHANVIEN', {
      MANV: manv,
      HOTEN: payload.HOTEN,
      EMAIL: payload.EMAIL,
      LUONG: payload.LUONG ?? null,
      VAITRO: payload.VAITRO ?? null,
    });
    return { success: true };
  }
  
  async refresh(currentUser: AuthUser) {
    // Read latest data from DB and re-issue JWT with updated role
    const rows = await this.databaseService.executeProcedure<LoginRow>('SP_SEL_NHANVIEN_BY_MANV', {
      MANV: currentUser.manv,
    });

    if (!rows || rows.length === 0) {
      throw new UnauthorizedException('Không tìm thấy người dùng.');
    }

    const user = rows[0];
    const isAdmin = Boolean(user.VAITRO);

    const accessToken = await this.jwtService.signAsync({
      manv: user.MANV,
      hoten: user.HOTEN,
      tendn: user.TENDN,
      isadmin: isAdmin,
    });

    return {
      accessToken,
      user: {
        manv: user.MANV,
        hoten: user.HOTEN,
        email: user.EMAIL,
        tendn: user.TENDN,
        pubkey: user.PUBKEY,
        isadmin: isAdmin,
      },
    };
  }

  async debugEmployee(manv: string, currentUser: AuthUser) {
    // Only admin may call this debug endpoint
    this.assertAdmin(currentUser);

    const rows = await this.databaseService.executeProcedure<EmployeeRow>('SP_SEL_NHANVIEN_BY_MANV', {
      MANV: manv,
    });

    if (!rows || rows.length === 0) {
      throw new UnauthorizedException('Không tìm thấy thông tin nhân viên.');
    }

    const row = rows[0];

    const luongBuf = row.LUONG as any;
    let luongUtf8: string | null = null;
    let luongRawBase64: string | null = null;

    if (luongBuf == null) {
      luongUtf8 = null;
      luongRawBase64 = null;
    } else if (Buffer.isBuffer(luongBuf)) {
      luongUtf8 = luongBuf.toString('utf8');
      luongRawBase64 = luongBuf.toString('base64');
    } else {
      // If driver returned a string already
      const s = String(luongBuf);
      luongUtf8 = s;
      luongRawBase64 = Buffer.from(s, 'utf8').toString('base64');
    }

    return {
      manv: row.MANV,
      pubkey: row.PUBKEY,
      luongUtf8,
      luongRawBase64,
    };
  }
}
