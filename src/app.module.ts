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

@Module({
  imports: [
    PostsModule,
    TypeOrmModule.forRoot({
      // docker + docker-compose 로 postgres 를 실행
      // 데이터베이스 타입, docker-compose 에 작성한 DB 설정 내용
      type: 'postgres',
      host: '127.0.0.1',
      port: 5432,
      username: 'postgres', // 환경변수로 처리해야 됌
      password: 'postgres',
      database: 'postgres',
      entities: [PostsModel, UsersModel], // TypeORM 으로 관리할 entity
      synchronize: true, // code 와 db 의 싱크, 운영 시에는 false 로 두어야한다.
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
