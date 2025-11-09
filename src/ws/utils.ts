/**
 * WebSocket utility functions for broadcasting messages
 * 
 * Supports both Redis pub/sub (for multi-server deployments) and
 * direct WebSocket broadcasting (for single-server optimization)
 */

import { getRedisPublisher } from '../config/redis-pubsub.js';
import { WebSocket } from 'ws';
import { logInfo, logError } from '../shared/logger.js';

/**
 * Room-based WebSocket client mapping for efficient direct broadcasting
 * Maps roomId -> Set of WebSocket connections
 */
const roomClientMap = new Map<string, Set<WebSocket>>();

/**
 * Track which rooms each WebSocket connection is subscribed to
 * Maps WebSocket -> Set of roomIds
 */
const wsRoomMap = new WeakMap<WebSocket, Set<string>>();

/**
 * Register a WebSocket connection to a room
 * Used for efficient room-based broadcasting
 */
export function registerWebSocketToRoom(ws: WebSocket, roomId: string): void {
  // Add WebSocket to room's client set
  if (!roomClientMap.has(roomId)) {
    roomClientMap.set(roomId, new Set());
  }
  roomClientMap.get(roomId)!.add(ws);
  
  // Track room membership for this WebSocket
  if (!wsRoomMap.has(ws)) {
    wsRoomMap.set(ws, new Set());
  }
  wsRoomMap.get(ws)!.add(roomId);
  
  logInfo('WebSocket registered to room', { roomId });
}

/**
 * Unregister a WebSocket connection from a room
 * Called when connection closes or leaves room
 */
export function unregisterWebSocketFromRoom(ws: WebSocket, roomId: string): void {
  // Remove WebSocket from room's client set
  const clients = roomClientMap.get(roomId);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) {
      roomClientMap.delete(roomId);
    }
  }
  
  // Remove room from WebSocket's room set
  const rooms = wsRoomMap.get(ws);
  if (rooms) {
    rooms.delete(roomId);
  }
  
  logInfo('WebSocket unregistered from room', { roomId });
}

/**
 * Unregister WebSocket from all rooms
 * Called when connection closes
 */
export function unregisterWebSocket(ws: WebSocket): void {
  const rooms = wsRoomMap.get(ws);
  if (rooms) {
    for (const roomId of rooms) {
      unregisterWebSocketFromRoom(ws, roomId);
    }
  }
}

/**
 * Broadcast a message to all clients in a room
 * Uses direct WebSocket broadcasting for efficiency (single-server)
 * Falls back to Redis pub/sub for multi-server deployments
 * 
 * @param roomId - Room ID to broadcast to
 * @param message - Message to broadcast
 * @param useDirectBroadcast - If true, use direct WebSocket broadcast (default: true)
 */
export function broadcastToRoom(
  roomId: string, 
  message: any,
  useDirectBroadcast: boolean = true
): void {
  const payload = JSON.stringify(message);
  
  // Direct WebSocket broadcast (optimized for single-server)
  if (useDirectBroadcast) {
    const clients = roomClientMap.get(roomId);
    if (clients && clients.size > 0) {
      let sentCount = 0;
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(payload);
            sentCount++;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logError('Failed to send WebSocket message', error instanceof Error ? error : new Error(errorMessage));
            // Remove dead connection
            unregisterWebSocketFromRoom(client, roomId);
          }
        } else {
          // Remove closed connection
          unregisterWebSocketFromRoom(client, roomId);
        }
      }
      
      if (sentCount > 0) {
        logInfo('Broadcasted via direct WebSocket', { roomId, sentCount });
        return; // Successfully sent via direct broadcast
      }
    }
  }
  
  // Fallback to Redis pub/sub (for multi-server or when direct broadcast fails)
  try {
    const publisher = getRedisPublisher();
    publisher.publish(`room:${roomId}`, payload);
    logInfo('Broadcasted via Redis pub/sub', { roomId });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to broadcast via Redis', error instanceof Error ? error : new Error(errorMessage));
  }
}

