import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PostsService } from '../posts.service';

@Injectable()
export class PatchPostGuard implements CanActivate {
  constructor(private readonly postsService: PostsService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    if (!req.user) {
      throw new InternalServerErrorException(
        'PatchPostGuard 는 BearerTokenGuard 또는 그것을 상속 받는 Guard 와 함께 사용되어야 합니다.',
      );
    }

    //console.log(req.params);

    const targetPostId = parseInt(req.params['id']);

    const targetPost = await this.postsService.getPostById(targetPostId);

    if (targetPost.author.id !== req.user.id) {
      throw new UnauthorizedException('수정 권한이 없습니다.');
    }

    return true;
  }
}
