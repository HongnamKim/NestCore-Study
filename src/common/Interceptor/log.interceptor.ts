import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, observable, Observable, tap } from 'rxjs';

@Injectable()
export class LogInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    /**
     * 요청이 들어올 때 REQ 요청이 들어온 타임스탬프를 찍는다.
     * [REQ] {요청 path} {요청 시간}
     *
     * 요청이 끝날 때 다시 타임스탬프를 찍는다.
     * [RES] {요청 path} {응답 시간} {소요 시간 ms}
     */

    const req = context.switchToHttp().getRequest();
    const path = req.originalUrl;

    const now = new Date();

    // 요청 시간
    console.log(`[REQ] ${path} ${now.toLocaleString('kr')}`);

    // return next.handle() 을 실행하는 순간
    // route 의 로직이 실행되고 응답이 observable 로 반환된다.
    // --> return 값이 tap 의 callback 함수의 파라미터로 전달된다.

    return next
      .handle() // 응답 값 받음
      .pipe(
        // 응답 값 받은 후 처리할 로직들
        // [RES] {요청 path} {응답 시간} {소요 시간 ms}
        tap(() =>
          console.log(
            `[RES] ${path} ${new Date().toLocaleString('kr')} ${new Date().getMilliseconds() - now.getMilliseconds()}ms`,
          ),
        ),
      );
  }
}
