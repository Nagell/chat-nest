import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatMessage } from './types/chat.types';
import { SecurityUtil } from '../common/utils/security.util';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Get allowed origins from environment variables
      const corsOrigins =
        process.env.ALLOWED_ORIGINS || 'http://localhost:3000';
      const allowedOrigins = corsOrigins
        .split(',')
        .map((origin) => origin.trim());

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Support both for reliability
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private sessionRooms = new Map<string, string>(); // socketId -> roomName
  private userConnections = new Map<string, Set<string>>(); // sessionId -> Set<socketId>

  constructor() {}

  /**
   * Handle new client connections
   */
  handleConnection(client: Socket) {
    this.logger.log(
      `🔌 Client connected: ${client.id} from ${client.handshake.address}`,
    );

    // Send connection acknowledgment
    client.emit('connection-status', {
      connected: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client disconnections
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Client disconnected: ${client.id}`);

    const roomName = this.sessionRooms.get(client.id);
    if (roomName) {
      this.sessionRooms.delete(client.id);

      // Remove from user connections tracking
      const sessionId = roomName.replace('session-', '');
      const connections = this.userConnections.get(sessionId);
      if (connections) {
        connections.delete(client.id);
        if (connections.size === 0) {
          this.userConnections.delete(sessionId);
        }
      }

      // Notify others in the room about disconnection
      client.to(roomName).emit('user-disconnected', {
        sessionId: parseInt(sessionId),
        timestamp: new Date().toISOString(),
        activeConnections: connections?.size || 0,
      });
    }
  }

  /**
   * Join a specific chat session room
   */
  @SubscribeMessage('join-session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number; userType?: 'visitor' | 'admin' },
  ) {
    const { sessionId, userType = 'visitor' } = data;
    const roomName = `session-${sessionId}`;

    // Leave previous room if any
    const previousRoom = this.sessionRooms.get(client.id);
    if (previousRoom) {
      client.leave(previousRoom);
    }

    // Join new room
    client.join(roomName);
    this.sessionRooms.set(client.id, roomName);

    // Track user connections
    if (!this.userConnections.has(sessionId.toString())) {
      this.userConnections.set(sessionId.toString(), new Set());
    }
    this.userConnections.get(sessionId.toString())?.add(client.id);

    const activeConnections =
      this.userConnections.get(sessionId.toString())?.size || 0;

    this.logger.log(
      `👥 Client ${client.id} joined session ${sessionId} as ${userType}`,
    );

    // Notify client of successful join
    client.emit('session-joined', {
      sessionId,
      roomName,
      userType,
      activeConnections,
      timestamp: new Date().toISOString(),
    });

    // Notify others in the room
    client.to(roomName).emit('user-joined', {
      sessionId,
      userType,
      activeConnections,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Leave current session room
   */
  @SubscribeMessage('leave-session')
  handleLeaveSession(@ConnectedSocket() client: Socket) {
    const roomName = this.sessionRooms.get(client.id);
    if (roomName) {
      client.leave(roomName);
      this.sessionRooms.delete(client.id);

      const sessionId = roomName.replace('session-', '');
      const connections = this.userConnections.get(sessionId);
      if (connections) {
        connections.delete(client.id);
        if (connections.size === 0) {
          this.userConnections.delete(sessionId);
        }
      }

      this.logger.log(`👋 Client ${client.id} left ${roomName}`);

      client.emit('session-left', {
        sessionId: parseInt(sessionId),
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle typing indicators
   */
  @SubscribeMessage('typing-start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number; userType: 'visitor' | 'admin' },
  ) {
    const roomName = `session-${data.sessionId}`;
    client.to(roomName).emit('typing-start', {
      sessionId: data.sessionId,
      userType: data.userType,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('typing-stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: number; userType: 'visitor' | 'admin' },
  ) {
    const roomName = `session-${data.sessionId}`;
    client.to(roomName).emit('typing-stop', {
      sessionId: data.sessionId,
      userType: data.userType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle message delivery confirmation
   */
  @SubscribeMessage('message-delivered')
  handleMessageDelivered(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number; sessionId: number },
  ) {
    const roomName = `session-${data.sessionId}`;
    client.to(roomName).emit('message-confirmed', {
      messageId: data.messageId,
      sessionId: data.sessionId,
      deliveredAt: new Date().toISOString(),
    });
  }

  /**
   * Public method to send new message to session participants
   */
  sendMessageToSession(sessionId: number, message: ChatMessage): void {
    const roomName = `session-${sessionId}`;
    const activeConnections =
      this.userConnections.get(sessionId.toString())?.size || 0;

    // Sanitize message content for WebSocket transmission
    const sanitizedMessage = SecurityUtil.sanitizeMessage(message);

    this.server.to(roomName).emit('new-message', {
      ...sanitizedMessage,
      deliveryInfo: {
        activeConnections,
        deliveredAt: new Date().toISOString(),
      },
    });

    this.logger.log(
      `📨 Message ${message.id} sent to ${activeConnections} clients in session ${sessionId}`,
    );
  }

  /**
   * Send system notification to session
   */
  sendSystemNotification(sessionId: number, notification: any): void {
    const roomName = `session-${sessionId}`;
    this.server.to(roomName).emit('system-notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    activeSessions: number;
    sessionsWithUsers: number;
  } {
    return {
      totalConnections: this.sessionRooms.size,
      activeSessions: this.userConnections.size,
      sessionsWithUsers: Array.from(this.userConnections.values()).filter(
        (connections) => connections.size > 0,
      ).length,
    };
  }

  /**
   * Check if session has active connections
   */
  isSessionActive(sessionId: number): boolean {
    const connections = this.userConnections.get(sessionId.toString());
    return connections ? connections.size > 0 : false;
  }
}
