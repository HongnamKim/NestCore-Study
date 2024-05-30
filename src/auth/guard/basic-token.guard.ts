import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * TODO
 *
 * 1) 요청 객체 (request) 를 불러오고
 *    authorization header 로부터 토큰을 가져온다.
 *
 * 2) authService.extractTokenFromHeader 를 이용해서
 *    사용 할 수 있는 형태의 토큰을 추출
 *
 * 3) authService.decodeBasicToken 을 실행해서
 *    email 과 password 를 추출한다.
 *
 * 4) email 과 password 를 이용해서 사용자를 가져온다.
 *    authService.authenticateWithEmailAndPassword
 *
 * 5) 찾아낸 사용자를 (1) 요청 객체에 붙여준다.
 *    req.user = user;
 */
@Injectable()
export class BasicTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ExecutionContext 에서 http 요청으로 바꾼 후, request 객체 가져오기
    const req = context.switchToHttp().getRequest();

    // {authorization: 'Basic asdfasdf'}
    const rawToken = req.headers['authorization'];

    if (!rawToken) {
      throw new UnauthorizedException('토큰이 없습니다.');
    }

    // token 에서 Basic 키워드 제거
    const token = this.authService.extractTokenFromHeader(rawToken, false);

    // Base64 디코드 하고 email 과 password 추출
    const { email, password } = this.authService.decodeBasicToken(token);

    // 로그인
    const user = await this.authService.authenticateWithEmailAndPassword({
      email,
      password,
    });

    req.user = user;

    // false 가 나올 상황은 위에서 error 가 던져지게 됨.
    return true;
  }
}
