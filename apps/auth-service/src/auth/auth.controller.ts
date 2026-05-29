import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new passenger' })
  @ApiResponse({ status: 201, description: 'User successfully registered and KYC event emitted.' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive JWT' })
  @ApiResponse({ status: 200, description: 'Returns a JWT access token.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('seed-admin')
  @ApiOperation({ summary: 'Temporary endpoint to seed the admin user' })
  seedAdmin() {
    return this.authService.seedAdmin();
  }
}
