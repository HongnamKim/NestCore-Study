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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { AccessTokenGuard } from '../auth/guard/bearer-token.guard';
import { User } from '../users/decorator/user.decorator';

import { CreatePostDto } from './dto/create-post.dto';

import { UpdatePostDto } from './dto/update-post.dto';
import { PatchPostGuard } from './guard/patch-post.guard';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { UsersModel } from '../users/entities/users.entity';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // 1) GET /posts
  @Get()
  getPosts(@Query() query: PaginatePostDto) {
    //return this.postsService.getAllPosts();
    return this.postsService.paginatePosts(query);
  }

  // /posts/random
  @Post('random')
  @UseGuards(AccessTokenGuard)
  async postPostRandom(@User() user: UsersModel) {
    await this.postsService.generatePosts(user.id);

    return true;
  }

  // 2-2) GET /posts/author?authorId
  @Get('author')
  getPostByAuthorId(@Query('authorId', ParseIntPipe) authorId: number) {
    return this.postsService.getPostByAuthorId(authorId);
  }

  // 2) GET /posts/:id
  @Get(':id')
  getPost(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostById(id);
  }

  // 3) POST /posts
  @Post()
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('image')) // 요청 시 key 값
  postPosts(
    //@Request() req: any,
    // @Body('title') title: string,
    // @Body('content') content: string,
    @User('id') userId: number,
    @Body() body: CreatePostDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    //const authorId = req.user.id; --> AccessTokenGuard 에서 JWT 확인 후 req 에 넣은 사용자 정보
    return this.postsService.createPost(userId, body, file?.filename);
  }

  // 4) PATCH /posts/:id
  @Patch(':id')
  @UseGuards(AccessTokenGuard, PatchPostGuard)
  patchPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePostDto,
    // @Body('title') title?: string,
    // @Body('content') content?: string,
  ) {
    return this.postsService.updatePost(+id, body);
  }

  // 5) DELETE /posts/:id
  @Delete(':id')
  deletePost(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.deletePost(+id);
  }
}
