import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { JWtStrategy } from './strategies/jwt.strategy';
import { JWTAuthGuard } from './guards/jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JWtStrategy, JWTAuthGuard],
  imports: [
    PassportModule.register({
      session: false,
    }),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:  process.env.JWT_EXPIRES_IN? parseInt  (process.env.JWT_EXPIRES_IN,10): 30 * 24 * 60 * 60 * 1000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [AuthService, JWTAuthGuard],
})
export class AuthModule {}
