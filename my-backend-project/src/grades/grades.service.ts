import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class GradesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAllHocPhan() {
    return this.databaseService.executeProcedure('SP_SEL_HOCPHAN');
  }

  /**
   * Lab 4: Lấy điểm đang ở dạng mã hóa (Base64) để Client tự giải mã.
   * Backend KHÔNG giải mã, chỉ trả về chuỗi nguyên bản.
   */
  async getBangDiem(manv: string, malop: string, mahp: string) {
    try {
      return await this.databaseService.executeProcedure('SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN', {
        MANV: manv,
        MALOP: malop,
        MAHP: mahp,
      });
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  /**
   * Lab 4: Lưu điểm đã được mã hóa RSA từ Client vào CSDL.
   * Backend KHÔNG biết giá trị điểm thực tế.
   */
  async updateGrade(manv: string, masv: string, mahp: string, diemthiEnc: string) {
    try {
      await this.databaseService.executeProcedure('SP_INS_UPD_BANGDIEM', {
        MANV: manv,
        MASV: masv,
        MAHP: mahp,
        DIEMTHI: diemthiEnc,
      });
      return { success: true };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  /**
   * Lấy Public Key của nhân viên từ CSDL (dạng PEM string).
   */
  async getPublicKey(manv: string): Promise<string | null> {
    try {
      const rows = await this.databaseService.executeProcedure<{ PUBKEY: string }>(
        'SP_GET_PUBKEY_NHANVIEN',
        { MANV: manv },
      );
      if (!rows.length || !rows[0].PUBKEY) return null;
      return rows[0].PUBKEY;
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }

  /**
   * Cập nhật Public Key mới cho nhân viên (khi tạo cặp khóa mới từ giao diện).
   */
  async updatePublicKey(manv: string, pubkey: string) {
    try {
      await this.databaseService.executeProcedure('SP_UPDATE_PUBKEY_NHANVIEN', {
        MANV: manv,
        PUBKEY: pubkey,
      });
      return { success: true };
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
  }
}

