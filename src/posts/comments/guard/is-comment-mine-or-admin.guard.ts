import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersModel } from '../../../users/entity/users.entity';
import { CommentsService } from '../comments.service';
import { RolesEnum } from '../../../users/const/roles.const';

@Injectable()
export class IsCommentMineOrAdminGuard implements CanActivate {
  constructor(private readonly commentsService: CommentsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest() as Request & {
      user: UsersModel;
    };

    const { user } = req;

    if (!user) {
      throw new UnauthorizedException('사용자 정보를 가져올 수 없습니다.');
    }

    if (user.role === RolesEnum.ADMIN) {
      return true;
    }

    const commentId = parseInt(req.params.commentId);

    const isOk = await this.commentsService.isCommentMine(user.id, commentId);

    if (!isOk) {
      throw new ForbiddenException(
        '해당 요청을 수행할 수 있는 권한이 없습니다.',
      );
    }

    return true;
  }
}
