import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  Get,
  Param,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';

import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { IAuthenticatedRequest } from 'src/common/types/authenticated-request.interface';
import { ConfigService } from '@nestjs/config';
import { IOpenRouterResponse } from 'src/common/types/openRouter.interface';
import { StartConversationDto } from './dto/start-conversation.dto';

@Controller('conversation')
@UseGuards(JWTAuthGuard)
export class ConversationController {
  constructor(
    private readonly configService: ConfigService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post()
  async sendMessage(
    @Body()
    body: StartConversationDto,
    @Req() req: IAuthenticatedRequest,
  ) {
    return await this.conversationService.sendMessage(body, req);
  }

  @Get('user')
  async getUserConversations(@Req() req: IAuthenticatedRequest) {
   
    const conversations =
      await this.conversationService.getUserConversations(req);
    return conversations;
  }
  @Get(':conversationId')
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: IAuthenticatedRequest,
  ) {
 
    return this.conversationService.getConversationContext(
      req,
      conversationId,
    );
  }
}
