import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  event: string;

  @IsObject()
  data: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
