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
    const userId = req?.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated.');
    }

    const prompt = body?.prompt;
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('Prompt cannot be empty.');
    }

    let conversationId = body?.conversationId;
    if (!conversationId) {
      const newConversation =
        await this.conversationService.createConversation(userId);
      conversationId = newConversation.conversationId;
    }

    // append user message to conversation
    await this.conversationService.appendMessage(
      userId,
      conversationId,
      'user',
      prompt,
    );

    const messages = await this.conversationService.getConversationContext(
      userId,
      conversationId,
    );

    // Prepare context for OpenRouter
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Call OpenRouter API
    const openRouterKey =
      this.configService.get<string>('OPENROUTER_KEY') || '';

    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            //   model: 'deepseek/deepseek-chat-v3.1:free',
            model: 'deepseek/deepseek-r1-0528:free',
            messages: formattedMessages,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }
      const result = (await response.json()) as IOpenRouterResponse;

      const assistantReply = result?.choices?.[0]?.message?.content || '...';
      const updatedConversation = await this.conversationService.appendMessage(
        userId,
        conversationId,
        'assistant',
        assistantReply,
      );

      return {
        conversationId: updatedConversation.conversationId,
        reply: assistantReply,
        context: updatedConversation.messages,
      };
    } catch (err) {
      throw new BadRequestException(
        'An error occurred with openrouter communication',
        {
          cause: err,
          description: `Openrouter misbehaving`,
        },
      );
    }
  }

  @Get('user')
  async getUserConversations(@Req() req: IAuthenticatedRequest) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated.');
    }
    const conversations =
      await this.conversationService.getUserConversations(userId);
    return conversations;
  }
  @Get(':conversationId')
  async getConversationMessages(
    @Param('conversationId') conversationId: string,
    @Req() req: IAuthenticatedRequest,
  ) {
    const userId = req?.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated.');
    }
    return this.conversationService.getConversationContext(
      userId,
      conversationId,
    );
  }
}
