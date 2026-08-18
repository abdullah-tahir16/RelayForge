import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { EventStatus } from '../entities/event.entity';

export class ListEventsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsUUID()
  endpointId?: string;
}
