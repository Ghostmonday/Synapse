/**
 * WebSocket utility functions for broadcasting messages
 */

import { getRedisPublisher } from '../config/redis-pubsub.js';

/**
 * Broadcast a message to all clients in a room via Redis pub/sub
 */
export function broadcastToRoom(roomId: string, message: any): void {
  const publisher = getRedisPublisher();
  publisher.publish(`room:${roomId}`, JSON.stringify(message));
}

