import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationModule } from './conversation/conversation.module';
import { LoggerMiddleware } from './middlewares/logger.middleware';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import Joi from 'joi';
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute
        limit: 100, // 100 requests per minute per IP
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
     
        MONGODB_URI: Joi.string().required(),
        NODE_ENV: Joi.string()
          .required()
          .valid('development', 'production', 'preproduction'),
        OPENROUTER_KEY: Joi.string().required(),
        OPENROUTER_MODEL: Joi.string().required(),
        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_CALLBACK_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        FRONTEND_URL: Joi.string().required(),
      }),

    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        let baseUri = configService.get<string>('MONGODB_URI');
        const dbUser = configService.get<string>('DB_USER');
        const dbUserPass = configService.get<string>('DB_PASS');
        const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

        if (!(baseUri && dbUser && dbUserPass && nodeEnv)) {
          throw new Error('❌ ENV varibles not set to connect to MONGODB.');
        }

        baseUri = baseUri.replace('<password>', dbUserPass);
        baseUri = baseUri.replace('<user>', dbUser);
        const envSuffix =
          nodeEnv === 'production' ? '/production' : '/development';

        const mongoUri = `${baseUri}${envSuffix}`;

        console.log(`✅ Connecting to MongoDB in ${envSuffix}  environment`);

        return {
          uri: mongoUri,
        };
      },
    }),
    AuthModule,
    ConversationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
