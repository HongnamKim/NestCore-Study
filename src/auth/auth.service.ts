import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersModel } from '../users/entities/users.entity';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from './dto/register-user.dto';
import { ConfigService } from '@nestjs/config';
import {
  ENV_HASH_ROUNDS,
  ENV_JWT_SECRET,
} from '../common/const/env-keys.const';

type JwtToken = string;
type LoginJwtTokens = {
  accessToken: JwtToken;
  refreshToken: JwtToken;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    // module 에서 import 받은 UsersModule 의 UsersService 사용
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 토큰을 사용하게 되는 방식
   *
   * 1) 사용자가 로그인 또는 회원가입을 진행하면
   *    accessToken 과 refreshToken 을 발급받는다.
   *
   * 2) 로그인 할때는 Basic 토큰을 헤더에 넣고 요청을 보낸다.
   *    Basic 토큰은 '이메일:비밀번호' 를 Base64 로 인코딩
   *    예) {authorization: 'Basic {token}'}
   *
   * 3) 아무나 접근 할 수 없는 정보(private route)에 접근할 때는
   *    accessToken 을 Header 에 추가해서 요청을 보냄
   *    예) {authorization: 'Bearer {token}'}
   *
   * 4) 토큰과 요청을 받은 서버는 토큰 검증을 통해 요청을 보낸
   *    사용자가 누구인지 알 수 있다.
   *    예) 로그인한 사용자가 작성한 포스트를 가져오려면
   *        토큰의 sub 값에 입력돼있는 사용자(id)의 포스트만 필터링
   *
   * 5) 토큰은 만료 기간이 있다. 만료기간이 지나면 새로 토큰을 발급 받아야 한다.
   *    만료 기간이 지나면 jwtService.verify() 에서 통과가 되지 않는다.
   *    accessToken 을 새로 발급 받을 /auth/token/access
   *    refreshToken 을 새로 발급 받을 /auth/token/refresh 가 필요
   *
   * 6) 토큰이 만료되면 각각의 토큰을 새로 발급 받을 수 있는 엔드포인트에 요청을 해서
   *    새로운 토큰을 발급받고 새로운 토큰을 사용해서 private route 에 접근한다.
   */

  /**
   * header 로부터 토큰을 받을 때
   * {authorization: 'Basic {token}'}
   * {authorization: 'Bearer {token}'}
   *
   */

  /**
   * header 의 authorization 을 받고, 유효성 검사 및 토큰 추출
   * @param header 요청 header 의 authorization key 의 value
   * @param isBearer Bearer token 일 경우 true,
   *                 Basic token -> false
   */
  extractTokenFromHeader(header: string, isBearer: boolean) {
    const splitToken = header.split(' ');

    const prefix = isBearer ? 'Bearer' : 'Basic';

    if (splitToken.length !== 2 || splitToken[0] !== prefix) {
      throw new UnauthorizedException('잘못된 토큰입니다.');
    }

    const token = splitToken[1];

    return token;
  }

  /**
   * Basic sldkfjasldkfjaf
   *
   * 1) sldkfjasldkfjaf --> email:password
   * 2) email:password -> [email, password]
   */
  /**
   * base64 인코딩된 email:password 에서 {email, password} object
   * @param base64String base64 encoded email:password string
   * @return email,password object
   */
  decodeBasicToken(base64String: string): { email: string; password: string } {
    const decoded = Buffer.from(base64String, 'base64').toString('utf8');

    const split = decoded.split(':');

    if (split.length !== 2) {
      throw new UnauthorizedException('잘못된 유형의 토큰입니다.');
    }

    const email = split[0];
    const password = split[1];

    return {
      email,
      password,
    };
  }

  /**
   * JWT token 검증
   * @param token JWT 토큰
   */
  verifyToken(token: string) {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>(ENV_JWT_SECRET),
      });
    } catch (e) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  /**
   * JWT token 재발급
   * @param token
   * @param isRefreshToken refreshToken 인지 아닌지
   */
  rotateToken(token: string, isRefreshToken: boolean) {
    // JWT payload
    const decoded = this.jwtService.verify(token, {
      secret: this.configService.get<string>(ENV_JWT_SECRET),
    });

    /**
     * sub: id
     * email: email,
     * type: 'access' | 'refresh'
     */
    if (decoded.type !== 'refresh') {
      // accessToken 으로 재발급 방지
      throw new UnauthorizedException(
        '토큰 재발급은 refresh 토큰으로만 가능합니다.',
      );
    }

    return this.signToken(
      {
        ...decoded,
        id: decoded.sub,
      },
      isRefreshToken,
    );
  }

  /**
   * TODO
   * 1) registerWithEmail
   *    - email, nickname, password 를 입력받고 사용자 생성
   *    - 생성이 완료되면 accessToken, refreshToken 발급
   *
   * 2) loginWithEmail
   *    - email, password 를 입력하면 사용자 검증 진행
   *    - 검증이 완료되면 accessToken, refreshToken 반환
   *
   * 3) loginUser
   *    - (1)과 (2) 에서 필요한 accessToken 과 refreshToken 을 반환하는 로직
   *
   * 4) signToken
   *    - (3)에서 필요한 accessToken, refreshToken 을 sign 하는 로직
   *
   * 5) authenticateWithEmailAndPassword
   *    - (2)에서 로그인을 진행할 때 필요한 기본적인 검증 진행
   *      1. 사용자가 존재하는지 확인 (email) --> UserRepository 필요
   *      2. 비밀번호가 맞는지 확인
   *      3. 모두 통과되면 찾은 사용자 정보 반환
   *      4. loginWithEmail 에서 반환된 데이터를 기반으로 토큰 생성
   */
  async registerWithEmail(
    //user: Pick<UsersModel, 'nickname' | 'email' | 'password'>,
    user: RegisterUserDto,
  ) {
    // hash 할 데이터, hash round
    const hash = await bcrypt.hash(
      user.password,
      this.configService.get<number>(ENV_HASH_ROUNDS),
    );

    const newUser = await this.usersService.createUser({
      ...user,
      password: hash,
    });

    return this.loginUser(newUser);
  }

  async loginWithEmail(user: Pick<UsersModel, 'email' | 'password'>) {
    // 올바른 이메일, 비밀번호 확인
    const existingUser = await this.authenticateWithEmailAndPassword(user);

    // accessToken, refreshToken 발행
    return this.loginUser(existingUser);
  }

  /**
   * 올바른 이메일과 비밀번호일 경우 UsersModel 반환
   * @param user
   */
  async authenticateWithEmailAndPassword(
    user: Pick<UsersModel, 'email' | 'password'>,
  ): Promise<UsersModel> {
    // DB 에 저장된 정보
    const existingUser = await this.usersService.getUserByEmail(user.email);

    if (!existingUser) {
      throw new UnauthorizedException('존재하지 않는 사용자입니다.');
    }

    /**
     * 1) 입력된 비밀번호
     * 2) 기존 해시 --> DB 에 저장되어 있는 해시
     *
     * true 면 올바른 비밀번호
     */
    const passOk = await bcrypt.compare(user.password, existingUser.password);
    //const passOk = user.password === existingUser.password;

    if (!passOk) {
      throw new UnauthorizedException('올바르지 않은 비밀번호입니다.');
    }

    return existingUser;
  }

  /**
   * 인증 완료된 사용자의 email 과 id 를 받아서
   * accessToken 과 refreshToken 을 반환
   * @param user
   */
  loginUser(user: Pick<UsersModel, 'email' | 'id'>): LoginJwtTokens {
    return {
      accessToken: this.signToken(user, false),
      refreshToken: this.signToken(user, true),
    };
  }

  /**
   * Payload 에 들어갈 정보
   * 1) email
   * 2) sub -> id (db id)
   * 3) type: accessToken | refreshToken
   */

  signToken(
    user: Pick<UsersModel, 'email' | 'id'>,
    isRefreshToken: boolean,
  ): JwtToken {
    const payload = {
      email: user.email,
      sub: user.id,
      type: isRefreshToken ? 'refresh' : 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>(ENV_JWT_SECRET),
      // seconds
      expiresIn: isRefreshToken ? 3600 : 300,
    });
  }
}
