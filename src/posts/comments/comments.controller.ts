import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommonService } from '../../common/common.service';
import { PaginateCommentsDto } from './dto/paginate-comments.dto';
import { AccessTokenGuard } from '../../auth/guard/bearer-token.guard';
import { CreateCommentsDto } from './dto/create-comments.dto';
import { User } from '../../users/decorator/user.decorator';
import { UsersModel } from '../../users/entity/users.entity';
import { UpdateCommentsDto } from './dto/update-comments.dto';

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly commonService: CommonService,
  ) {
    /**
     * 1) Entity 생성
     * author -> 작성자
     * post -> 귀속되는 post
     * comment -> 실제 댓글 내용
     * likeCount -> 좋아요 갯수
     *
     * 2) GET() pagination
     * 3) GET(':commentId') 특정 comment 만 하나 가져오는 기능
     * 4) POST() 코멘트 생성하는 기능
     * 5) PATCH(':commentId') 특정 comment 업데이트
     * 6) DELETE(':commentId') 특정 comment 삭제
     */
  }

  @Get()
  paginateComments(
    @Param('postId', ParseIntPipe) postId: number,
    @Query() query: PaginateCommentsDto,
  ) {
    return this.commentsService.paginateComments(query, postId);
  }

  @Get(':commentId')
  getComment(@Param('commentId', ParseIntPipe) commentId: number) {
    return this.commentsService.getCommentById(commentId);
  }

  @Post()
  @UseGuards(AccessTokenGuard)
  postComment(
    @Param('postId', ParseIntPipe) postId: number,
    @Body() body: CreateCommentsDto,
    @User() user: UsersModel,
  ) {
    return this.commentsService.createComment(body, postId, user);
  }

  @Patch(':commentId')
  @UseGuards(AccessTokenGuard)
  async patchComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() body: UpdateCommentsDto,
  ) {
    return this.commentsService.updateComment(body, commentId);
  }

  @Delete(':commentId')
  @UseGuards(AccessTokenGuard)
  deleteComment(@Param('commentId', ParseIntPipe) commentId: number) {
    return this.commentsService.deleteComment(commentId);
  }
}
