import { IsIn, IsNumber, IsOptional } from 'class-validator';

export class BasePaginationDto {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  where__id__less_than?: number;

  @IsNumber()
  @IsOptional()
  where__id__more_than?: number;

  // 정렬 옵선
  // createdAt -> 생성된 시간의 내림/오름차순으로 정렬
  @IsIn(['ASC', 'asc', 'DESC', 'desc']) // 배열 안의 값만 허용
  @IsOptional()
  order__createdAt: 'ASC' | 'asc' | 'DESC' | 'desc' = 'ASC';

  // 데이터 개수
  @IsNumber()
  @IsOptional()
  //@Type(() => Number)
  take: number = 20;
}
