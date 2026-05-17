import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPostsDto {
  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'uuid-of-last-post' })
  @IsUUID()
  @IsOptional()
  cursor?: string;
}
