import { BadRequestException, Injectable } from '@nestjs/common';
import { BasePaginationDto } from './dto/base-pagination.dto';
import {
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { BaseModel } from './entity/base.entity';
import { FILTER_MAPPER } from './const/filter-mapper.const';
import { ConfigService } from '@nestjs/config';
import { ENV_HOST_KEY, ENV_PROTOCOL_KEY } from './const/env-keys.const';

@Injectable()
export class CommonService {
  constructor(private readonly configService: ConfigService) {}
  /**
   * @param dto pagination 을 위한 옵션 dto
   * @param repository 데이터를 가져올 repository
   * @param overrideFindOptions 기본 쿼리 옵션 덮어쓰는 경우
   * @param path nextUrl 을 위한 url ex) posts, users
   */
  paginate<T extends BaseModel>(
    dto: BasePaginationDto,
    repository: Repository<T>,
    overrideFindOptions: FindManyOptions<T> = {},
    path: string,
  ) {
    if (dto.page) {
      return this.pagePaginate(dto, repository, overrideFindOptions);
    } else {
      return this.cursorPaginate(dto, repository, overrideFindOptions, path);
    }
  }

  private async pagePaginate<T extends BaseModel>(
    dto: BasePaginationDto,
    repository: Repository<T>,
    overrideFindOptions: FindManyOptions<T> = {},
  ) {
    /**
     * dto = {
     *   where__id__more_than = 20;
     *   order__createdAt = 'asc';
     *   page = 1;
     *   take = 20;
     * }
     */
    const findOptions = this.composeFindOptions<T>(dto);

    const [data, count] = await repository.findAndCount({
      ...findOptions,
      ...overrideFindOptions,
    });

    return {
      data,
      total: count,
    };
  }

  private async cursorPaginate<T extends BaseModel>(
    dto: BasePaginationDto,
    repository: Repository<T>,
    overrideFindOptions: FindManyOptions<T> = {},
    path: string,
  ) {
    /**
     * where__likeCount__more_than
     *
     * where__title__i_like
     */

    /**
     * findOptions = {
     *   where: {
     *     id: MoreThan(dto.where__id__more_than), (20)
     *   },
     *   order: {
     *     createdAt: dto.order__createdAt, ('ASC' | 'DESC')
     *   },
     *   take: dto.take (20)
     * }
     */
    // 요청 쿼리 파라미터로 보낸 key, value 로 FindManyOptions 생성
    const findOptions = this.composeFindOptions<T>(dto);

    const results = await repository.find({
      ...findOptions,
      ...overrideFindOptions,
    });

    const lastItem =
      results.length > 0 && results.length === dto.take
        ? results[results.length - 1]
        : null;

    const protocol = this.configService.get<string>(ENV_PROTOCOL_KEY);
    const host = this.configService.get<string>(ENV_HOST_KEY);

    // lastItem 이 있는 경우에만 생성
    const nextUrl = lastItem && new URL(`${protocol}://${host}/${path}`);

    if (nextUrl) {
      for (const key of Object.keys(dto)) {
        if (dto[key]) {
          // 요청 시 보낸 order 와 take 를 유지
          if (
            key !== 'where__id__more_than' &&
            key !== 'where__id__less_than'
          ) {
            nextUrl.searchParams.append(key, dto[key]);
          }
        }
      }

      let key;

      if (dto.order__createdAt === 'ASC' || dto.order__createdAt === 'asc') {
        key = 'where__id__more_than';
      } else {
        key = 'where__id__less_than';
      }

      // 마지막 post 의 id 로 쿼리 파라미터 넣어줌.
      nextUrl.searchParams.append(key, lastItem.id.toString());
    }

    return {
      data: results,
      cursor: {
        after: lastItem?.id ?? null,
      },
      count: results.length,
      next: nextUrl?.toString() ?? null,
    };
  }

  /**
   * dto 의 구조
   * {
   *   where__id__more_than: 1,
   *   order__createdAt: 'ASC'
   * }
   * 모든 where 필터들을 자동으로 파싱할 수 있는 기능 필요
   *
   * 1) where 로 시작한다면 필터 로직을 적용
   * 2) order 로 시작한다면 정렬 로직을 적용
   * 3) 필터 로직을 적용한다면 '__' 기준으로 split 을 했을 때 3개의 값으로 나뉘는지, 2개로 나뉘는지 확인
   *    3-1) 3개의 값이라면 FILTER_MAPPER 에서 해당되는 operator 함수를 찾아서 적용
   *         ['where', 'id', 'more_than']
   *    3-2) 2개의 값이라면 정확한 값을 필터하는 것이기 때문에 operator 없이 적용
   *         where__id: 3 --> findOne 같은 경우
   *         ['where', 'id']
   * 4) order 의 경우 3-2 와 같이 적용
   *    ['order', 'createdAt']
   */
  private composeFindOptions<T extends BaseModel>(
    dto: BasePaginationDto,
  ): FindManyOptions<T> {
    /**
     * where,
     * order,
     * take,
     * skip -> page 기반일 때만
     */

    let where: FindOptionsWhere<T> = {};
    let order: FindOptionsOrder<T> = {};

    for (const [key, value] of Object.entries(dto)) {
      // key --> where__id__less_than, order__createdAt
      if (key.startsWith('where__')) {
        where = {
          ...where,
          ...this.parseWhereFilter(key, value),
        };
      } else if (key.startsWith('order__')) {
        order = {
          ...order,
          ...this.parseOrderFilter(key, value),
        };
      }
    }

    return {
      where,
      order,
      take: dto.take,
      skip: dto.page ? dto.take * (dto.page - 1) : null,
    };
  }

  private parseWhereFilter<T extends BaseModel>(
    key: string,
    value: any,
  ): FindOptionsWhere<T> {
    const options: FindOptionsWhere<T> = {};
    // key: where__id__more_than
    const split = key.split('__');

    if (split.length !== 2 && split.length !== 3) {
      throw new BadRequestException(
        `where 필터는 '__' 로 split 했을 때 길이가 2 또는 3이어야 합니다. - 문제되는 키: ${key}`,
      );
    }
    if (split.length === 2) {
      // where__id: 3
      const [_, field] = split;
      options[field] = value;
      /**
       * options = {
       *   id: 3
       * }
       */
    } else {
      // where__id__more_than
      const [_, field, operator] = split;

      // value 가 여러개 들어오는 경우 ex) where__id__between = 3, 5
      const values = value.toString().split(',');

      if (operator === 'between') {
        options[field] = FILTER_MAPPER[operator](values[0], values[1]);
      } else if (operator === 'like' || operator === 'i_like') {
        options[field] = FILTER_MAPPER[operator](`%${value}%`);
      } else {
        options[field] = FILTER_MAPPER[operator](value);
      }
      /**
       * options = {
       *   id: MoreThan(3)
       * }
       */
    }

    return options;
  }

  private parseOrderFilter<T extends BaseModel>(
    key: string,
    value: any,
  ): FindOptionsOrder<T> {
    const options: FindOptionsOrder<T> = {};
    // order__createdAt: 'asc'
    const split = key.split('__');

    if (split.length !== 2) {
      throw new BadRequestException(
        `order 필터는 '__' 로 split 했을 때 길이가 2어야 합니다. - 문제되는 키값: ${key}`,
      );
    }

    const [_, filed] = split;
    options[filed] = value;

    return options;
  }
}
