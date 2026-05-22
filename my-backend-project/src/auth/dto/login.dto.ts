import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  manv!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  matkhau!: string;
}
