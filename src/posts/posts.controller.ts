import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { AccessTokenGuard } from '../auth/guard/bearer-token.guard';
import { User } from '../users/decorator/user.decorator';

import { CreatePostDto } from './dto/create-post.dto';

import { UpdatePostDto } from './dto/update-post.dto';
import { PatchPostGuard } from './guard/patch-post.guard';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { UsersModel } from '../users/entities/users.entity';
import { ImageModelType } from '../common/entity/image.entity';
import { DataSource, QueryRunner } from 'typeorm';
import { PostsImagesService } from './image/images.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly postsImagesService: PostsImagesService,
    private readonly dataSource: DataSource,
  ) {}

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
  // 파일 업로드는 CommonModule 에서 수행
  //@UseInterceptors(FileInterceptor('image')) // 요청 시 key 값
  async postPosts(
    //@Request() req: any,
    // @Body('title') title: string,
    // @Body('content') content: string,
    //@UploadedFile() file?: Express.Multer.File,
    @User('id') userId: number,
    @Body() body: CreatePostDto,
  ) {
    //const authorId = req.user.id; --> AccessTokenGuard 에서 JWT 확인 후 req 에 넣은 사용자 정보

    //return this.postsService.createPost(userId, body, file?.filename); --> 파일 업로드는 CommonModule 에서

    // QueryRunner 생성
    const qr: QueryRunner = this.dataSource.createQueryRunner();
    // QueryRunner 연결
    await qr.connect();
    // transaction 시작
    await qr.startTransaction();

    try {
      // 포스트 글만 생성
      const post = await this.postsService.createPost(userId, body, qr);

      // 이미지 entity 생성, relation 맺기
      for (let i = 0; i < body.images.length; i++) {
        await this.postsImagesService.createPostImage(
          {
            post: post, // 연결될 post
            order: i, // post 내 이미지 순서
            path: body.images[i], // 이미지 경로(temp 폴더 내 이름)
            type: ImageModelType.POST_IMAGE, // post 용 이미지
          },
          qr,
        );
      }

      await qr.commitTransaction();

      return this.postsService.getPostById(post.id);
    } catch (e) {
      await qr.rollbackTransaction();
      //await qr.release();

      throw e;
    } finally {
      await qr.release();
    }
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
