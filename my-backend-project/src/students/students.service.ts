import { Injectable, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly db: DatabaseService) {}

  // SỬA LỖI: Bổ sung currentMaNv và maLop để truy vấn đúng danh sách SV của lớp mà nhân viên đó quản lý
  async findAll(currentMaNv: string, maLop: string) {
    try {
      return await this.db.executeProcedure<any>('SP_SEL_SINHVIEN_BY_NHANVIEN_LOP', {
        MANV: currentMaNv,
        MALOP: maLop
      });
    } catch (e) {
      throw new ForbiddenException((e as Error).message);
    }
  }

  async create(dto: CreateStudentDto, currentMaNv: string) {
    try {
      return await this.db.executeProcedure<any>('SP_INS_SINHVIEN', {
        MASV: dto.MASV,
        HOTEN: dto.HOTEN,
        NGAYSINH: dto.NGAYSINH,
        DIACHI: dto.DIACHI,
        MALOP: dto.MALOP,
        TENDN: dto.TENDN,
        MK: dto.MK, // Lưu ý: Theo đề bài, nếu băm ở client thì MK ở đây phải là dạng mã hóa
        MANV: currentMaNv,
      });
    } catch (e) {
      throw new ForbiddenException((e as Error).message);
    }
  }

  async update(id: string, dto: UpdateStudentDto, currentMaNv: string) {
    try {
      return await this.db.executeProcedure<any>('SP_UPD_SINHVIEN', {
        MASV: id,
        HOTEN: dto.HOTEN,
        NGAYSINH: dto.NGAYSINH,
        DIACHI: dto.DIACHI,
        MANV: currentMaNv,
      });
    } catch (e) {
      throw new ForbiddenException((e as Error).message);
    }
  }

  async remove(id: string, currentMaNv: string) {
    try {
      return await this.db.executeProcedure<any>('SP_DEL_SINHVIEN', {
        MASV: id,
        MANV: currentMaNv,
      });
    } catch (e) {
      throw new ForbiddenException((e as Error).message);
    }
  }
}