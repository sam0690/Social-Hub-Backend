import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum Visibility {
  PUBLIC = 'PUBLIC',
  FOLLOWERS = 'FOLLOWERS',
  PRIVATE = 'PRIVATE',
}

export class CreatePostDto {
  @ApiProperty({ example: 'Hello world! #firstpost @johndoe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;

  @ApiPropertyOptional({ enum: Visibility, default: Visibility.PUBLIC })
  @IsEnum(Visibility)
  @IsOptional()
  visibility?: Visibility = Visibility.PUBLIC;
}
