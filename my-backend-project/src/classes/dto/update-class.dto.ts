import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tenlop!: string;
}
