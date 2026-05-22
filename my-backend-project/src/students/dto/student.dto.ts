import { IsNotEmpty, IsString, MaxLength, IsDateString, IsOptional } from 'class-validator';

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  MASV!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  HOTEN!: string;

  @IsOptional()
  @IsDateString()
  NGAYSINH?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  DIACHI?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  MALOP!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  TENDN!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  MK!: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  HOTEN?: string;

  @IsOptional()
  @IsDateString()
  NGAYSINH?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  DIACHI?: string;
}