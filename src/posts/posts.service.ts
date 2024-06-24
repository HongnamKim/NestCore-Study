import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FindOptionsWhere,
  ILike,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { PostsModel } from './entities/posts.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { CommonService } from '../common/common.service';
import { ConfigService } from '@nestjs/config';
import { ENV_HOST_KEY, ENV_PROTOCOL_KEY } from '../common/const/env-keys.const';

@Injectable()
export class PostsService {
  constructor(
    // TypeORM 의 Repository 를 주입 받음. 해당 Repository 로 다루는 Entity 를 넣어줘야함.
    // Repository 함수의 return 은 Promise 반환 (async)
    @InjectRepository(PostsModel)
    private readonly postRepository: Repository<PostsModel>,
    private readonly commonService: CommonService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * //@deprecated paginatePosts 로 대체되었음.
   */
  async getAllPosts() {
    // find 조건이 없다면 테이블의 모든 데이터 반환
    return this.postRepository.find({
      //relations: ['author'],
      relations: {
        author: true,
      },
    });
  }

  async generatePosts(userId: number) {
    for (let i = 0; i < 100; i++) {
      await this.createPost(userId, {
        title: `임의로 생성된 포스트 제목 ${i}`,
        content: `임의로 생성된 포스트 내용 ${i}`,
      });
    }
  }

  async paginatePosts(dto: PaginatePostDto) {
    return this.commonService.paginate(
      dto,
      this.postRepository,
      { relations: ['author'] },
      'posts',
    );
    /*if (dto.page) {
      return this.pagePaginatePosts(dto);
    } else {
      return this.cursorPaginatePosts(dto);
    }*/
  }

  /**
   * Response
   * data: Data[],
   * total: number,
   */
  async pagePaginatePosts(dto: PaginatePostDto) {
    console.log(dto);
    const [posts, count] = await this.postRepository.findAndCount({
      order: {
        createdAt: dto.order__createdAt,
      },
      skip: dto.take * (dto.page - 1),
      take: dto.take,
    });

    return {
      data: posts,
      total: count,
      //total: await this.postRepository.count(),
    };
  }

  /**
   * Response
   * data: Data[],
   * cursor: {
   *   after: 마지막 Data 의 ID
   * },
   * count: 응답한 데이터 개수,
   * next: 다음 요청 시 사용할 URL
   */
  async cursorPaginatePosts(dto: PaginatePostDto) {
    const where: FindOptionsWhere<PostsModel> = {};

    if (dto.where__id__less_than) {
      where.id = LessThan(dto.where__id__less_than);
    } else if (dto.where__id__more_than) {
      where.id = MoreThan(dto.where__id__more_than);
    }

    const posts = await this.postRepository.find({
      where,
      order: {
        createdAt: dto.order__createdAt,
      },
      take: dto.take,
    });

    // 반환하는 포스트가 0개 이상이면
    // 마지막 포스트
    // 0개일 경우 || 다음 cursor 가 없을 경우 null 을 반환
    const lastItem =
      posts.length > 0 && posts.length === dto.take
        ? posts[posts.length - 1]
        : null;

    const protocol = this.configService.get<string>(ENV_PROTOCOL_KEY);
    const host = this.configService.get<string>(ENV_HOST_KEY);

    // lastItem 이 있는 경우에만 생성
    const nextUrl = lastItem && new URL(`${protocol}://${host}/posts`);

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
      data: posts,
      cursor: {
        after: lastItem?.id ?? null, // undefined 대신 null
      },
      count: posts.length,
      next: nextUrl?.toString() ?? null,
    };
  }

  async getPostById(id: number) {
    // async 이기 때문에 await 를 해야한다.
    const post = await this.postRepository.findOne({
      where: {
        id,
      },
      //relations: ['author'],
      relations: {
        author: true,
      },
    });

    if (!post) {
      throw new NotFoundException();
    }

    return post;
  }

  async getPostByAuthorId(authorId: number) {
    const posts = await this.postRepository.find({
      where: {
        author: {
          id: authorId,
        },
      },
      relations: {
        author: true,
      },
    });

    return posts;
  }

  async createPost(authorId: number, postDto: CreatePostDto, image?: string) {
    // 1) create -> 저장할 객체를 생성
    // 2) save -> 객체를 저장 (create 로 생성한 객체)

    const post = this.postRepository.create({
      author: {
        id: authorId,
      },
      ...postDto,
      image,
      likeCount: 0,
      commentCount: 0,
    });

    const newPost = await this.postRepository.save(post);

    return newPost;
  }

  async updatePost(postId: number, postDto: UpdatePostDto) {
    // Repository.save 의 기능
    // 1) 만약 데이터가 존재하지 않는다면 (primary key 기준), 새로 생성
    // 2) 만약 데이터가 존재한다면, 해당 값을 업데이트

    // select * from posts_model where id = postId
    const post = await this.postRepository.findOne({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException();
    }

    const title = postDto.title;
    const content = postDto.content;

    // 값 수정
    if (title) {
      post.title = title;
    }
    if (content) {
      post.content = content;
    }

    // update posts_model set ... where id=post.id
    const newPost = await this.postRepository.save(post);

    //posts = posts.map((prevPost) => (prevPost.id === postId ? post : prevPost));

    return newPost;
  }

  async deletePost(postId: number) {
    const post = await this.postRepository.findOne({
      where: {
        id: postId,
      },
    });

    if (!post) {
      throw new NotFoundException();
    }

    // delete from posts_model where id = postId
    await this.postRepository.delete(postId);

    return postId;
  }
}

export interface PostModel {
  id: number;
  author: string;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
}
