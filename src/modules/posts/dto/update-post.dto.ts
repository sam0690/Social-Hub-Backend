import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { Visibility } from './create-post.dto';

export class UpdatePostDto {
  @ApiPropertyOptional({ example: 'Updated content' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  content?: string;

  @ApiPropertyOptional({ enum: Visibility })
  @IsEnum(Visibility)
  @IsOptional()
  visibility?: Visibility;
}
