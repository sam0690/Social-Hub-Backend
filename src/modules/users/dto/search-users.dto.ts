import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchUsersDto {
  @ApiPropertyOptional({ example: 'john' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;
}
