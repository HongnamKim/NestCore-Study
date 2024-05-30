import {
  Body,
  Controller,
  Headers,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { MaxLengthPipe, MinLengthPipe } from './pipe/password.pipe';
import { BasicTokenGuard } from './guard/basic-token.guard';
import { RefreshTokenGuard } from './guard/bearer-token.guard';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token/access')
  @UseGuards(RefreshTokenGuard)
  postTokenAccess(@Headers('authorization') rawToken: string) {
    const token = this.authService.extractTokenFromHeader(rawToken, true);

    /**
     * refreshToken 인지 확인 후 accessToken 재발급
     * newToken = {accessToken: {token}}
     */
    const newToken = this.authService.rotateToken(token, false);

    return {
      accessToken: newToken,
    };
  }

  @Post('token/refresh')
  @UseGuards(RefreshTokenGuard)
  postTokenRefresh(@Headers('authorization') rawToken: string) {
    const token = this.authService.extractTokenFromHeader(rawToken, true);

    const newToken = this.authService.rotateToken(token, true);

    return {
      refreshToken: newToken,
    };
  }

  @Post('login/email')
  @UseGuards(BasicTokenGuard)
  postLoginEmail(
    /*@Body('email') email: string, @Body('password') password: string*/
    @Headers('authorization') rawToken: string,
  ) {
    // email:password -> base64 encoding
    // alskdjflaaosdfj;asldkfj -> email:password decoding

    // header 에서 base64 인코딩된 토큰 추출 Basic {token} --> {token}
    const token = this.authService.extractTokenFromHeader(rawToken, false);

    // base64 토큰 decoding {token} --> { email: email, password: password }
    const credentials = this.authService.decodeBasicToken(token);

    return this.authService.loginWithEmail(credentials);
  }

  @Post('register/email')
  postRegisterEmail(
    // @Body('nickname') nickname: string,
    // @Body('email') email: string,
    // @Body('password', new MaxLengthPipe(8), new MinLengthPipe(4))
    // password: string,
    @Body() body: RegisterUserDto,
  ) {
    return this.authService.registerWithEmail(
      //{ nickname, email, password }
      body,
    );
  }
}
