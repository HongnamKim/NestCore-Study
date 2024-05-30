import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersModel } from '../entities/users.entity';

export const User = createParamDecorator(
  (data: keyof UsersModel | undefined, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    const user = req.user as UsersModel;

    if (!user) {
      throw new InternalServerErrorException(
        'User 데코레이터는 AccessTokenGuard 와 함께 사용해야합니다.\nRequest 에 user 프로퍼티가 존재하지 않습니다.',
      );
    }

    // data 는 반드시 UsersModel 의 프로퍼티 또는 undefined
    // data 값이 있을 경우 UsersModel 의 프로퍼티를 반환
    if (data) {
      return user[data];
    }

    return user;
  },
);
