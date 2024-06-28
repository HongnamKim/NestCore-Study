import { FindManyOptions } from 'typeorm';
import { PostsModel } from '../entities/posts.entity';

export const DEFAULT_POST_FIND_OPTIONS: FindManyOptions<PostsModel> = {
  relations: {
    author: true,
    images: true,
  },
};
