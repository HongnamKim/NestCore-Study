import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, LessThan, MoreThan, Repository } from 'typeorm';
import { PostsModel } from './entities/posts.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { HOST, PROTOCOL } from '../common/const/env.const';

export interface PostModel {
  id: number;
  author: string;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
}

@Injectable()
export class PostsService {
  constructor(
    // TypeORM 의 Repository 를 주입 받음. 해당 Repository 로 다루는 Entity 를 넣어줘야함.
    // Repository 함수의 return 은 Promise 반환 (async)
    @InjectRepository(PostsModel)
    private readonly postRepository: Repository<PostsModel>,
  ) {}

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

  /**
   * Response
   * data: Data[],
   * cursor: {
   *   after: 마지막 Data 의 ID
   * },
   * count: 응답한 데이터 개수,
   * next: 다음 요청 시 사용할 URL
   */
  // 1) 오름차순으로 정렬하는 pagination 만 구현
  async paginatePosts(dto: PaginatePostDto) {
    const where: FindOptionsWhere<PostsModel> = {};

    if (dto.where__id_less_than) {
      where.id = LessThan(dto.where__id_less_than);
    } else if (dto.where__id_more_than) {
      where.id = MoreThan(dto.where__id_more_than);
    }

    const posts = await this.postRepository.find({
      where,
      order: {
        createdAt: dto.order__createdAt,
      },
      take: dto.take,
    });

    // 해당되는 포스트가 0개 이상이면
    // 마지막 포스트
    // 0개일 경우 null 을 반환
    const lastItem =
      posts.length > 0 && posts.length === dto.take
        ? posts[posts.length - 1]
        : null;

    // lastItem 이 있는 경우에만 생성
    const nextUrl = lastItem && new URL(`${PROTOCOL}://${HOST}/posts`);

    console.log(dto);
    console.log(Object.keys(dto));

    if (nextUrl) {
      for (const key of Object.keys(dto)) {
        if (dto[key]) {
          // 요청 시 보낸 order 와 take 를 유지
          if (key !== 'where__id_more_than' && key !== 'where__id_less_than') {
            nextUrl.searchParams.append(key, dto[key]);
          }
        }
      }

      let key = null;

      if (dto.order__createdAt === 'ASC') {
        key = 'where__id_more_than';
      } else {
        key = 'where__id_less_than';
      }

      // 마지막 post 의 id 로 쿼리 파라미터 넣어줌.
      nextUrl.searchParams.append(key, lastItem.id.toString());
    }

    return {
      data: posts,
      cursor: {
        after: lastItem?.id ?? null,
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

  async createPost(authorId: number, postDto: CreatePostDto) {
    // 1) create -> 저장할 객체를 생성
    // 2) save -> 객체를 저장 (create 로 생성한 객체)

    const post = this.postRepository.create({
      author: {
        id: authorId,
      },
      ...postDto,
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
