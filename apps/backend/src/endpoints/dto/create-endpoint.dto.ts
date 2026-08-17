import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateEndpointDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  url: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30000)
  timeoutMs?: number;
}
