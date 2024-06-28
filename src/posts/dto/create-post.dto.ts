import { PickType } from '@nestjs/mapped-types';
import { PostsModel } from '../entities/posts.entity';
import { IsOptional, IsString } from 'class-validator';

export class CreatePostDto extends PickType(PostsModel, ['title', 'content']) {
  @IsOptional()
  @IsString({
    each: true,
  })
  images: string[] = [];
  //image?: string;

  // DTO property 와 PostsModel 과 중복되는 것이 많음.
  // PostsModel 을 상속하여 중복되는 코드 제거
  // PickType 으로 title, content 만 상속
  //
  /*@IsString({
    message: 'title 은 string 타입을 입력 해야합니다.',
  })
  title: string;

  @IsString({
    message: 'content 는 string 타입을 입력해야 합니다.',
  })
  content: string;*/
}
