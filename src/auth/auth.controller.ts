import { Body, Controller, HttpCode, Module, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser, Principal, Public } from './auth.guard';
import { LoginDto, PasswordDto, RefreshDto, RegisterDto } from './auth.dto';
@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Public() @Post('register') register(@Body() dto: RegisterDto) {
    return this.service.register(dto);
  }
  @Public() @Post('login') @HttpCode(200) login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }
  @Public() @Post('refresh') @HttpCode(200) refresh(@Body() dto: RefreshDto) {
    return this.service.refresh(dto.refreshToken);
  }
  @Post('logout') @HttpCode(200) logout(@CurrentUser() user: Principal) {
    return this.service.logout(user.sessionId);
  }
  @Post('password') @HttpCode(200) password(
    @CurrentUser() user: Principal,
    @Body() dto: PasswordDto,
  ) {
    return this.service.password(user.id, dto);
  }
}
@Module({ controllers: [AuthController], providers: [AuthService] })
export class AuthModule {}
