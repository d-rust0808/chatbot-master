/**
 * WebSocket Server
 * 
 * WHY: Real-time updates cho dashboard
 * - Message updates
 * - Conversation updates
 * - Platform status updates
 * - Connection status
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { logger } from './logger';

/**
 * WebSocket Server Manager
 * WHY: Centralized WebSocket management
 */
export class WebSocketServer {
  private io?: SocketIOServer;
  private connectedClients: Map<string, Set<string>> = new Map(); // tenantId -> Set of socketIds

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        credentials: true,
      },
      path: '/socket.io',
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      // Extract tenant from handshake (from JWT token hoặc query)
      const tenantId = socket.handshake.query.tenantId as string | undefined;

      if (tenantId) {
        // Add to tenant's client set
        if (!this.connectedClients.has(tenantId)) {
          this.connectedClients.set(tenantId, new Set());
        }
        this.connectedClients.get(tenantId)!.add(socket.id);
        
        // Auto-join tenant room để nhận balance updates
        socket.join(`tenant:${tenantId}`);
        logger.debug(`Client ${socket.id} joined tenant room: ${tenantId}`);
      }

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
        if (tenantId) {
          this.connectedClients.get(tenantId)?.delete(socket.id);
        }
      });

      // Handle subscribe to conversation
      socket.on('subscribe:conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
        logger.debug(`Client ${socket.id} subscribed to conversation ${conversationId}`);
      });

      // Handle unsubscribe from conversation
      socket.on('unsubscribe:conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        logger.debug(`Client ${socket.id} unsubscribed from conversation ${conversationId}`);
      });

      // Handle subscribe to platform status
      socket.on('subscribe:platform', (connectionId: string) => {
        socket.join(`platform:${connectionId}`);
        logger.debug(`Client ${socket.id} subscribed to platform ${connectionId}`);
      });
    });
  }

  /**
   * Emit message update
   */
  emitMessageUpdate(tenantId: string, conversationId: string, message: any): void {
    if (!this.io) return;

    this.io.to(`conversation:${conversationId}`).emit('message:new', {
      conversationId,
      message,
    });

    // Also emit to tenant's dashboard
    this.io.to(`tenant:${tenantId}`).emit('conversation:update', {
      conversationId,
      messageCount: 1, // Could be actual count
    });
  }

  /**
   * Emit conversation update
   */
  emitConversationUpdate(tenantId: string, conversation: any): void {
    if (!this.io) return;

    this.io.to(`tenant:${tenantId}`).emit('conversation:update', conversation);
  }

  /**
   * Emit platform status update
   */
  emitPlatformStatusUpdate(tenantId: string, connectionId: string, status: string): void {
    if (!this.io) return;

    this.io.to(`platform:${connectionId}`).emit('platform:status', {
      connectionId,
      status,
    });

    this.io.to(`tenant:${tenantId}`).emit('platform:status', {
      connectionId,
      status,
    });
  }

  /**
   * Emit wallet balance update
   * WHY: Real-time balance updates khi nạp tiền, mua credit, hoặc có giao dịch
   */
  emitBalanceUpdate(tenantId: string, balances: { vnd: number; credit: number }): void {
    if (!this.io) return;

    // Emit to all clients of this tenant
    this.io.to(`tenant:${tenantId}`).emit('wallet:balance:update', {
      tenantId,
      balances: {
        vnd: balances.vnd,
        credit: balances.credit,
      },
      timestamp: new Date().toISOString(),
    });

    logger.debug('Balance update emitted', { tenantId, balances });
  }

  /**
   * Get connected clients count for tenant
   */
  getConnectedClientsCount(tenantId: string): number {
    return this.connectedClients.get(tenantId)?.size || 0;
  }

  /**
   * Get IO instance
   */
  getIO(): SocketIOServer | undefined {
    return this.io;
  }
}

// Export singleton instance
export const webSocketServer = new WebSocketServer();

