import { IsIn, IsNumber, IsOptional } from 'class-validator';
//import { Type } from 'class-transformer';

export class PaginatePostDto {
  // 이전 마지막 데이터의 ID
  // 이 프로퍼티에 입력된 ID 보다 높은 ID 부터 값을 가져오기
  @IsNumber()
  @IsOptional() // undefined 일 경우 0으로
  //@Type(() => Number) transformOption 의 enableImplicitConversion: true 로 대체
  where__id_more_than: number = 0;

  @IsNumber()
  @IsOptional()
  where__id_less_than: number;

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
