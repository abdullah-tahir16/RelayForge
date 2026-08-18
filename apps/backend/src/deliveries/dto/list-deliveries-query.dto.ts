import 'reflect-metadata';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { DeliveryStatus } from '../entities/delivery.entity';

export class ListDeliveriesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  @IsUUID()
  endpointId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  httpStatusCode?: number;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
