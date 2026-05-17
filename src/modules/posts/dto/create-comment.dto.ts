import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great post!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  content: string;

  @ApiPropertyOptional({ example: 'uuid-of-parent-comment' })
  @IsUUID()
  @IsOptional()
  parentCommentId?: string;
}
