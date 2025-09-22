import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  ValidationPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('api/chat')
@UseInterceptors(ClassSerializerInterceptor)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Create a new chat session
   * POST /api/chat/sessions
   */
  @Post('sessions')
  async createSession(
    @Body(ValidationPipe) createSessionDto: CreateSessionDto,
  ) {
    try {
      const session = await this.chatService.createSession(createSessionDto);

      this.logger.log(
        `📝 Session created: ${session.id} for ${createSessionDto.visitor_email}`,
      );

      return {
        success: true,
        data: session,
        message: 'Chat session created successfully',
      };
    } catch (error) {
      this.logger.error('Failed to create session:', error.message);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create chat session',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get session details
   * GET /api/chat/sessions/:id
   */
  @Get('sessions/:id')
  async getSession(@Param('id', ParseIntPipe) sessionId: number) {
    try {
      const session = await this.chatService.getSession(sessionId);

      return {
        success: true,
        data: session,
      };
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}:`, error.message);
      throw new HttpException(
        {
          success: false,
          message: 'Session not found',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Get messages for a specific session
   * GET /api/chat/sessions/:id/messages
   */
  @Get('sessions/:id/messages')
  async getMessages(@Param('id', ParseIntPipe) sessionId: number) {
    try {
      const messages = await this.chatService.getMessages(sessionId);

      return {
        success: true,
        data: messages,
        count: messages.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get messages for session ${sessionId}:`,
        error.message,
      );
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve messages',
          error: error.message,
        },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Mark messages as read
   * POST /api/chat/sessions/:id/mark-read
   */
  @Post('sessions/:id/mark-read')
  async markAsRead(
    @Param('id', ParseIntPipe) sessionId: number,
    @Body() body?: { messageIds?: number[] },
  ) {
    try {
      await this.chatService.markMessagesAsRead(sessionId, body?.messageIds);

      // Notify session participants
      this.chatGateway.sendSystemNotification(sessionId, {
        type: 'messages-read',
        sessionId,
        messageIds: body?.messageIds,
      });

      return {
        success: true,
        message: 'Messages marked as read',
      };
    } catch (error) {
      this.logger.error(
        `Failed to mark messages as read for session ${sessionId}:`,
        error.message,
      );
      throw new HttpException(
        {
          success: false,
          message: 'Failed to mark messages as read',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Send a new message
   * POST /api/chat/messages
   */
  @Post('messages')
  async sendMessage(@Body(ValidationPipe) sendMessageDto: SendMessageDto) {
    try {
      const message = await this.chatService.sendMessage(sendMessageDto);

      // Send real-time notification via WebSocket
      this.chatGateway.sendMessageToSession(sendMessageDto.session_id, message);

      this.logger.log(
        `💬 Message sent: ${message.id} by ${sendMessageDto.sender_type}`,
      );

      return {
        success: true,
        data: message,
        message: 'Message sent successfully',
      };
    } catch (error) {
      this.logger.error('Failed to send message:', error.message);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to send message',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Admin endpoints
   */

  /**
   * Get all sessions for admin dashboard
   * GET /api/chat/admin/sessions
   */
  @Get('admin/sessions')
  async getAdminSessions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const sessions = await this.chatService.getAllSessionsForAdmin();

      // Apply pagination if requested
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      let paginatedSessions = sessions;
      if (limitNum) {
        paginatedSessions = sessions.slice(offsetNum, offsetNum + limitNum);
      }

      return {
        success: true,
        data: paginatedSessions,
        pagination: {
          total: sessions.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: limitNum ? offsetNum + limitNum < sessions.length : false,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get admin sessions:', error.message);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve sessions',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get WebSocket connection statistics
   * GET /api/chat/admin/stats
   */
  @Get('admin/stats')
  async getConnectionStats() {
    try {
      const stats = this.chatGateway.getConnectionStats();

      return {
        success: true,
        data: {
          ...stats,
          serverTime: new Date().toISOString(),
          uptime: process.uptime(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get connection stats:', error.message);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to retrieve statistics',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check endpoint
   * GET /api/chat/health
   */
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}
