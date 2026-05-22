import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  malop!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenlop!: string;
}
