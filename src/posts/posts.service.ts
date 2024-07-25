import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FindOptionsWhere,
  LessThan,
  MoreThan,
  QueryRunner,
  Repository,
} from 'typeorm';
import { PostsModel } from './entity/posts.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginatePostDto } from './dto/paginate-post.dto';
import { CommonService } from '../common/common.service';
import { ConfigService } from '@nestjs/config';
import { ENV_HOST_KEY, ENV_PROTOCOL_KEY } from '../common/const/env-keys.const';
import { join, basename } from 'path';
import { POST_IMAGE_PATH, TEMP_FOLDER_PATH } from '../common/const/path.const';
import { promises } from 'fs';
import { CreatePostImageDto } from './image/dto/create-image.dto';
import { ImageModel } from '../common/entity/image.entity';
import { DEFAULT_POST_FIND_OPTIONS } from './const/default-post-find-options.const';

@Injectable()
export class PostsService {
  constructor(
    // TypeORM 의 Repository 를 주입 받음. 해당 Repository 로 다루는 Entity 를 넣어줘야함.
    // Repository 함수의 return 은 Promise 반환 (async)
    @InjectRepository(PostsModel)
    private readonly postRepository: Repository<PostsModel>,
    @InjectRepository(ImageModel)
    private readonly imageRepository: Repository<ImageModel>,
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
      /*relations: {
        author: true,
      },*/
      ...DEFAULT_POST_FIND_OPTIONS,
    });
  }

  async generatePosts(userId: number) {
    for (let i = 0; i < 100; i++) {
      await this.createPost(userId, {
        title: `임의로 생성된 포스트 제목 ${i}`,
        content: `임의로 생성된 포스트 내용 ${i}`,
        images: [],
      });
    }
  }

  async paginatePosts(dto: PaginatePostDto) {
    return this.commonService.paginate(
      dto,
      this.postRepository,
      {
        /*relations: ['author', 'images']*/
        ...DEFAULT_POST_FIND_OPTIONS,
      },
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

  async getPostById(id: number, qr?: QueryRunner) {
    const repository = this.getRepository(qr);

    // async 이기 때문에 await 를 해야한다.
    const post = await repository.findOne({
      where: {
        id,
      },
      //relations: ['author'],
      /*relations: {
        author: true,
        images: true,
      },*/
      ...DEFAULT_POST_FIND_OPTIONS,
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
      /*relations: {
        author: true,
        images: true,
      },*/
      ...DEFAULT_POST_FIND_OPTIONS,
    });

    return posts;
  }

  // PostImagesService 로 이동
  /*async createPostImage(dto: CreatePostImageDto) {
    // dto 의 이미지 이름으로
    // 파일의 경로를 생성

    const tempFilePath = join(TEMP_FOLDER_PATH, dto.path);

    try {
      // 파일이 존재하는지 확인
      // 존재하지 않는다면 에러를 던짐
      await promises.access(tempFilePath);
    } catch (e) {
      throw new BadRequestException('존재하지 않는 파일 입니다.');
    }

    // 파일의 이름만 가져오기
    // /Users/aaa/bbb/ccc/asdf.jpg => asdf.jpg
    const fileName = basename(tempFilePath);

    // 새로 이동할 포스트 폴더의 경로 + 이미지 이름
    // {프로젝트경로}/public/posts/asdf.jpg
    const newPath = join(POST_IMAGE_PATH, fileName);

    // 저장
    const result: ImageModel = await this.imageRepository.save({
      ...dto,
    });

    // 파일 옮기기
    await promises.rename(tempFilePath, newPath);

    return result;
  }*/

  getRepository(qr?: QueryRunner) {
    return qr
      ? qr.manager.getRepository<PostsModel>(PostsModel)
      : this.postRepository;
  }

  async createPost(authorId: number, postDto: CreatePostDto, qr?: QueryRunner) {
    // 1) create -> 저장할 객체를 생성
    // 2) save -> 객체를 저장 (create 로 생성한 객체)

    const repository: Repository<PostsModel> = this.getRepository(qr);

    const post = repository.create({
      author: {
        id: authorId,
      },
      ...postDto, // dto의 images 는 string[], PostsModel 의 images 는 ImageModel[]
      images: [], // post 에서는 비어있는 상태로, post 와 image 의 relation 은 image 에서 관리
      //image, --> Dto 에 이미지 경로 있음.
      likeCount: 0,
      commentCount: 0,
    });

    const newPost = await repository.save(post);

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

  checkPostExistsById(id: number) {
    return this.postRepository.exists({ where: { id } });
  }

  async isPostMine(userId: number, postId: number) {
    return this.postRepository.exists({
      where: {
        id: postId,
        author: {
          id: userId,
        },
      },
      relations: {
        author: true,
      },
    });
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
