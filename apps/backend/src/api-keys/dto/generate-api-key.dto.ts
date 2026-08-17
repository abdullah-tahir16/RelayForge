import { IsString, MinLength } from 'class-validator';

export class GenerateApiKeyDto {
  @IsString()
  @MinLength(1)
  name: string;
}
