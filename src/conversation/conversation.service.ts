import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from './conversation.schema';
import { TMessageRole } from './conversation.interfaces';
import { randomUUID } from 'crypto';
import { IAuthenticatedRequest } from 'src/common/types/authenticated-request.interface';
import { ConfigService } from '@nestjs/config';
import { validateUserId } from 'src/common/helpers/validateUserId.helper';
import { StartConversationDto } from './dto/start-conversation.dto';
import { IOpenRouterResponse } from 'src/common/types/openRouter.interface';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    private readonly configService: ConfigService,
  ) {}
  private async createConversation(userId: string) {
    const conversationId = randomUUID();
    const convo = await this.conversationModel.create({
      userId,
      conversationId,
      messagees: [],
    });
    return convo;
  }
  private async getConversation(userId: string, conversationId: string) {
    const convo = await this.conversationModel.findOne({
      userId,
      conversationId,
    });
    return convo;
  }

  private async appendMessage(
    userId: string,
    conversationId: string,
    role: TMessageRole,
    content: string,
  ) {
    const convo = await this.getConversation(userId, conversationId);
    if (!convo) {
      throw new BadRequestException('Conversation not found.');
    }
    convo.messages.push({ role, content, timestamp: new Date() });
    await convo.save();
    return convo;
  }

  async getConversationContext(req: IAuthenticatedRequest, conversationId: string) {
    const userId = await validateUserId(req);
    const convo = await this.getConversation(userId, conversationId);
    if (!convo) {
      throw new BadRequestException('Conversation not found.');
    }
    return convo?.messages ?? [];
  }

  async getUserConversations(req: IAuthenticatedRequest) {
     const userId = await validateUserId(req)
    return this.conversationModel
      .find({ userId })
      .select('conversationId createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .lean()
      .then((list) =>
        list.map((c) => ({
          conversationId: c.conversationId,
          lastUserMessage:
            c.messages?.filter((m) => m.role === 'user').pop()?.content || null,
          lastAssistantMessage:
            c.messages?.filter((m) => m.role === 'assistant').pop()?.content ||
            null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })),
      );
  }

  async sendMessage(body: StartConversationDto, req:IAuthenticatedRequest) {

     const userId =await validateUserId(req); 
     
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
        await this.createConversation(userId);
      conversationId = newConversation.conversationId;
    }

    // append user message to conversation
    await this.appendMessage(
      userId,
      conversationId,
      'user',
      prompt,
    );

    const messages = await this.getConversationContext(
      req,
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
      const updatedConversation = await this.appendMessage(
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
}
