import { BadRequestException, Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsModel } from './entities/posts.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CommonModule } from '../common/common.module';
import { MulterModule } from '@nestjs/platform-express';
import { extname } from 'path';
import * as multer from 'multer';
import { POST_IMAGE_PATH } from '../common/const/path.const';
import { v4 as uuid } from 'uuid';

@Module({
  // module 내의 provider 가 사용하는 Entity 또는 Repository 를 등록
  imports: [
    TypeOrmModule.forFeature([PostsModel]),
    AuthModule,
    UsersModule,
    CommonModule,
    MulterModule.register({
      limits: {
        // 바이트 단위
        fileSize: 100_000_000,
      },
      fileFilter: (req, file, cb) => {
        /**
         * cb (err, boolean)
         *
         * 첫번째 파라미터에는 에러가 있을 경우 에러 정보
         * 두번째 파라미터에는 파일을 받을지 말지에 대한 boolean
         */
        // xxx.jpg --> jpg 확장자 추출
        const ext = extname(file.originalname);

        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') {
          return cb(
            new BadRequestException('jpg/jpeg/png 파일만 업로드 가능'),
            false,
          );
        }

        return cb(null, true);
      },
      storage: multer.diskStorage({
        // 파일 저장 위치
        destination: function (req, res, cb) {
          cb(null, POST_IMAGE_PATH);
        },
        // 저장할 이름
        filename: function (req, file, cb) {
          // fkdjfdlkf-dlkfjdlf-dlkfjd-dkfjl.jpg
          cb(null, `${uuid()}${extname(file.originalname)}`);
        },
      }),
    }),
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
