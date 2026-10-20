import { Module, type DynamicModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DemoAuthController } from './demo-auth.controller.js';
import { PasswordHasher } from './password-hasher.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { SessionCookies } from './session-cookies.js';
import { TokenService } from './token.service.js';

/** Authentication. The demo sign-in route exists only when `demoMode` is true. */
@Module({})
export class AuthModule {
  static forRoot(options: { demoMode: boolean }): DynamicModule {
    return {
      module: AuthModule,
      imports: [JwtModule.register({}), UsersModule],
      controllers: options.demoMode ? [AuthController, DemoAuthController] : [AuthController],
      providers: [
        AuthService,
        PasswordHasher,
        RefreshTokenRepository,
        SessionCookies,
        TokenService,
      ],
      exports: [TokenService, PasswordHasher],
    };
  }
}
