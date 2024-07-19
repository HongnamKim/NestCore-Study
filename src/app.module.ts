import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PostsModule } from './posts/posts.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsModel } from './posts/entities/posts.entity';
import { UsersModule } from './users/users.module';
import { UsersModel } from './users/entities/users.entity';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ENV_DB_DATABASE_KEY,
  ENV_DB_HOST_KEY,
  ENV_DB_PASSWORD_KEY,
  ENV_DB_PORT_KEY,
  ENV_DB_USERNAME_KEY,
} from './common/const/env-keys.const';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PUBLIC_FOLDER_PATH } from './common/const/path.const';
import * as process from 'process';
import * as dotenv from 'dotenv';
import { ImageModel } from './common/entity/image.entity';
import { ChatsModule } from './chats/chats.module';
import { ChatsModel } from './chats/entity/chats.entity';
import { MessagesModel } from './chats/messages/entity/messages.entity';

dotenv.config();

@Module({
  imports: [
    /*TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        // docker + docker-compose 로 postgres 를 실행
        // 데이터베이스 타입, docker-compose 에 작성한 DB 설정 내용
        type: 'postgres',
        host: configService.get<string>(ENV_DB_HOST_KEY),
        port: configService.get<number>(ENV_DB_PORT_KEY),
        username: configService.get<string>(ENV_DB_USERNAME_KEY), //process.env[ENV_DB_USERNAME_KEY], // 환경변수로 처리해야 됌
        password: configService.get<string>(ENV_DB_PASSWORD_KEY), //process.env[ENV_DB_PASSWORD_KEY], //
        database: configService.get<string>(ENV_DB_DATABASE_KEY),
        entities: [PostsModel, UsersModel], // TypeORM 으로 관리할 entity
        synchronize: true, // code 와 db 의 싱크, 운영 시에는 false 로 두어야한다.
      }),
      inject: [ConfigService],
    }),*/
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env[ENV_DB_HOST_KEY],
      port: +process.env[ENV_DB_PORT_KEY],
      username: process.env[ENV_DB_USERNAME_KEY], //process.env[ENV_DB_USERNAME_KEY], // 환경변수로 처리해야 됌
      password: process.env[ENV_DB_PASSWORD_KEY], //process.env[ENV_DB_PASSWORD_KEY], //
      database: process.env[ENV_DB_DATABASE_KEY],
      entities: [PostsModel, UsersModel, ImageModel, ChatsModel, MessagesModel], // TypeORM 으로 관리할 entity
      synchronize: true, // code 와 db 의 싱크, 운영 시에는 false 로 두어야한다.
    }),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      // 4022.jpg
      // http://localhost:3000/posts/4022.jpg --> posts module 의 get 요청과 겹칠 수 있음
      rootPath: PUBLIC_FOLDER_PATH,
      // http://localhost:3000/public/posts/4022.jpg --> 파일 경로에 접두어를 붙여서 해결
      serveRoot: '/public',
    }),
    PostsModule,
    UsersModule,
    AuthModule,
    CommonModule,
    ChatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
