import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

type LopRow = {
  MALOP: string;
  TENLOP: string;
  MANV: string;
};

@Injectable()
export class ClassesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getManagedClasses(manv: string) {
    const rows = await this.databaseService.executeProcedure<LopRow>(
      'SP_SEL_LOP_BY_NHANVIEN',
      {
        MANV: manv,
      },
    );

    return rows.map((item) => ({
      malop: item.MALOP,
      tenlop: item.TENLOP,
      manv: item.MANV,
    }));
  }

  async createClass(manv: string, payload: CreateClassDto) {
    await this.databaseService.executeProcedure('SP_INS_LOP_BY_NHANVIEN', {
      MALOP: payload.malop,
      TENLOP: payload.tenlop,
      MANV: manv,
    });

    return { message: 'Tạo lớp thành công.' };
  }

  async updateClass(manv: string, malop: string, payload: UpdateClassDto) {
    await this.databaseService.executeProcedure('SP_UPD_LOP_BY_NHANVIEN', {
      MALOP: malop,
      TENLOP: payload.tenlop,
      MANV: manv,
    });

    return { message: 'Cập nhật lớp thành công.' };
  }

  async deleteClass(manv: string, malop: string) {
    await this.databaseService.executeProcedure('SP_DEL_LOP_BY_NHANVIEN', {
      MALOP: malop,
      MANV: manv,
    });

    return { message: 'Xóa lớp thành công.' };
  }

  async getAllClasses() {
    type AllLopRow = {
      MALOP: string;
      TENLOP: string;
      MANV: string;
      TENQUANLY: string;
    };

    const rows = await this.databaseService.executeProcedure<AllLopRow>(
      'SP_SEL_ALL_LOP',
    );

    return rows.map((item) => ({
      malop: item.MALOP,
      tenlop: item.TENLOP,
      manv: item.MANV,
      tenquanly: item.TENQUANLY || 'N/A',
    }));
  }

  async getStudentsByClass(manv: string, malop: string) {
    try {
      const rows = await this.databaseService.executeProcedure(
        'SP_SEL_SINHVIEN_BY_NHANVIEN_LOP',
        {
          MANV: manv,
          MALOP: malop,
        },
      );
      return rows;
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Lỗi truy xuất danh sách sinh viên');
    }
  }
}
