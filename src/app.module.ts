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

@Module({
  imports: [
    PostsModule,
    TypeOrmModule.forRootAsync({
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
    }),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    CommonModule,
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
