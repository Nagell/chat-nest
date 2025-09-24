import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { EmailService } from '../email/email.service';
import {
  ChatSession,
  ChatMessage,
  AdminSessionSummary,
  DatabaseSession,
  DatabaseMessage,
} from './types/chat.types';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SecurityUtil } from '../common/utils/security.util';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create a new chat session with unique email constraint
   */
  async createSession(
    createSessionDto: CreateSessionDto,
  ): Promise<ChatSession> {
    const { visitor_email, visitor_name } = createSessionDto;

    const session = await this.supabaseService.executeQuery(
      'createSession',
      async (client) => {
        // First check if an active session exists for this email
        const { data: existingSessions } = await client
          .from('chat_sessions')
          .select('*')
          .eq('visitor_email', visitor_email)
          .order('created_at', { ascending: false })
          .limit(1);

        // If there's a recent session (within 24 hours), return it
        if (existingSessions && existingSessions.length > 0) {
          const lastSession = existingSessions[0];
          const sessionAge =
            Date.now() - new Date(lastSession.created_at).getTime();
          const twentyFourHours = 24 * 60 * 60 * 1000;

          if (sessionAge < twentyFourHours) {
            this.logger.log(`Returning existing session for ${visitor_email}`);
            return { data: this.mapDatabaseSession(lastSession), error: null };
          }
        }

        // Create new session
        const sessionData = {
          visitor_email,
          visitor_name: visitor_name || null,
        };

        const { data: newSession, error } = await client
          .from('chat_sessions')
          .insert(sessionData)
          .select()
          .single();

        if (error) {
          return { data: null, error };
        }

        this.logger.log(
          `✅ Created new session ${newSession.id} for ${visitor_email}`,
        );
        return { data: this.mapDatabaseSession(newSession), error: null };
      },
    );

    if (!session) {
      throw new Error('Failed to create session');
    }

    return session;
  }

  /**
   * Send a message with guaranteed persistence and email notification
   */
  async sendMessage(sendMessageDto: SendMessageDto): Promise<ChatMessage> {
    const { session_id, content, sender_type } = sendMessageDto;

    // Store message with atomic operation
    const message = await this.supabaseService.executeQuery(
      'sendMessage',
      async (client) => {
        const messageData = {
          session_id,
          content: content.trim(),
          sender_type,
          is_read: sender_type === 'admin', // Admin messages are pre-read
          created_at: new Date().toISOString(),
        };

        const { data, error } = await client
          .from('chat_messages')
          .insert(messageData)
          .select()
          .single();

        return { data, error };
      },
    );

    const mappedMessage = this.mapDatabaseMessage(message);

    // For visitor messages, send email notification asynchronously
    if (sender_type === 'visitor') {
      this.sendEmailNotification(mappedMessage, session_id).catch((error) => {
        this.logger.error('Email notification failed:', error.message);
      });
    }

    this.logger.log(
      `✅ Message ${mappedMessage.id} sent by ${sender_type} in session ${session_id}`,
    );
    return mappedMessage;
  }

  /**
   * Get all messages for a session
   */
  async getMessages(sessionId: number): Promise<ChatMessage[]> {
    const messages = await this.supabaseService.executeQuery(
      'getMessages',
      async (client) => {
        const { data, error } = await client
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        return { data, error };
      },
    );

    if (!messages) {
      return [];
    }

    return messages.map((msg) => {
      const mappedMessage = this.mapDatabaseMessage(msg);
      // Sanitize content for safe display
      return SecurityUtil.sanitizeMessage(mappedMessage);
    });
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: number): Promise<ChatSession> {
    const session = await this.supabaseService.executeQuery(
      'getSession',
      async (client) => {
        const { data, error } = await client
          .from('chat_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        return { data, error };
      },
    );

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return this.mapDatabaseSession(session);
  }

  /**
   * Get all sessions for admin dashboard with summary info
   */
  async getAllSessionsForAdmin(): Promise<AdminSessionSummary[]> {
    return this.supabaseService.executeQuery(
      'getAllSessionsForAdmin',
      async (client) => {
        // Complex query to get session summary with message info
        const { data, error } = await client.rpc('get_admin_session_summary');

        if (error) {
          this.logger.warn(
            '⚠️ RPC call for get_admin_session_summary failed, falling back to manual query:',
            error.message,
          );
          // Fallback to manual query if RPC doesn't exist
          const { data: sessions, error: sessionError } = await client
            .from('chat_sessions')
            .select(
              `
              *,
              chat_messages (
                id,
                content,
                sender_type,
                is_read,
                created_at
              )
            `,
            )
            .order('created_at', { ascending: false });

          if (sessionError) {
            return { data: null, error: sessionError };
          }

          // Process sessions manually
          const processedSessions = sessions.map((session) => {
            const messages = session.chat_messages || [];
            const unreadMessages = messages.filter(
              (msg) => msg.sender_type === 'visitor' && !msg.is_read,
            );
            const lastMessage = messages[messages.length - 1];

            const mappedSession = this.mapDatabaseSession(session);
            const sanitizedSession =
              SecurityUtil.sanitizeSession(mappedSession);
            return {
              ...sanitizedSession,
              last_message: lastMessage?.content
                ? SecurityUtil.escapeHtml(lastMessage.content.substring(0, 100))
                : null,
              last_message_at: lastMessage?.created_at || session.created_at,
              unread_count: unreadMessages.length,
              total_messages: messages.length,
            };
          });

          return { data: processedSessions, error: null };
        }

        // Sanitize data from RPC function as well
        if (data && Array.isArray(data)) {
          const sanitizedData = data.map((session) => {
            const sanitizedSession = SecurityUtil.sanitizeSession(session);
            return {
              ...sanitizedSession,
              last_message: session.last_message
                ? SecurityUtil.escapeHtml(session.last_message)
                : null,
            };
          });
          return { data: sanitizedData, error };
        }

        return { data, error };
      },
    );
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    sessionId: number,
    messageIds?: number[],
  ): Promise<void> {
    await this.supabaseService.executeQuery(
      'markMessagesAsRead',
      async (client) => {
        let query = client
          .from('chat_messages')
          .update({ is_read: true })
          .eq('session_id', sessionId)
          .eq('sender_type', 'visitor'); // Only mark visitor messages as read

        if (messageIds && messageIds.length > 0) {
          query = query.in('id', messageIds);
        }

        const { data, error } = await query;
        return { data, error };
      },
    );

    this.logger.log(`✅ Marked messages as read for session ${sessionId}`);
  }

  /**
   * Send email notification for visitor messages
   */
  private async sendEmailNotification(
    message: ChatMessage,
    sessionId: number,
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId);

      // Create sanitized message and session for email
      const sanitizedMessage = SecurityUtil.sanitizeMessage(message);
      const sanitizedSession = SecurityUtil.sanitizeSession(session);

      const emailSent = await this.emailService.notifyAdmin(
        sanitizedMessage,
        sanitizedSession,
      );

      if (emailSent) {
        // Record successful email delivery
        await this.supabaseService.executeQuery(
          'recordEmailDelivery',
          async (client) => {
            const { data, error } = await client
              .from('chat_messages')
              .update({ email_sent_at: new Date().toISOString() })
              .eq('id', message.id);

            return { data, error };
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to send email notification:', error.message);
    }
  }

  /**
   * Map database session to application model
   */
  private mapDatabaseSession(dbSession: DatabaseSession): ChatSession {
    return {
      id: dbSession.id,
      visitor_email: dbSession.visitor_email,
      visitor_name: dbSession.visitor_name || undefined,
      session_token: dbSession.session_token,
      created_at: dbSession.created_at,
    };
  }

  /**
   * Map database message to application model
   */
  private mapDatabaseMessage(dbMessage: DatabaseMessage): ChatMessage {
    return {
      id: dbMessage.id,
      session_id: dbMessage.session_id,
      content: dbMessage.content,
      sender_type: dbMessage.sender_type as 'visitor' | 'admin',
      is_read: dbMessage.is_read,
      delivered_at: dbMessage.delivered_at || undefined,
      email_sent_at: dbMessage.email_sent_at || undefined,
      created_at: dbMessage.created_at,
    };
  }
}
