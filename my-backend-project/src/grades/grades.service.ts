import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class GradesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAllHocPhan() {
    return this.databaseService.executeProcedure('SP_SEL_HOCPHAN');
  }

  async getBangDiem(manv: string, malop: string, mahp: string, mk: string) {
    return this.databaseService.executeProcedure('SP_SEL_BANGDIEM_GIAIMA_BY_NHANVIEN_LOP_HOCPHAN', {
      MANV: manv,
      MALOP: malop,
      MAHP: mahp,
      MK: mk,
    });
  }

  async updateGrade(manv: string, masv: string, mahp: string, diemthi: number) {
    await this.databaseService.executeProcedure('SP_INS_UPD_BANGDIEM', {
      MANV: manv,
      MASV: masv,
      MAHP: mahp,
      DIEMTHI: diemthi,
    });
    return { success: true };
  }
}

