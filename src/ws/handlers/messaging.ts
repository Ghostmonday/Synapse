/**
 * Handle messaging WSEnvelope and broadcast to room clients
 * Uses WebSocket room-based broadcasting for direct connections
 * Also publishes to Redis for cross-server scenarios
 */

import { WebSocket } from 'ws';
import { getRedisClient } from '../../config/db.js';
import { broadcastToRoom } from '../gateway.js';

const redis = getRedisClient();

export function handleMessaging(ws: WebSocket, envelope: any) {
  const roomId = envelope.room_id || envelope.roomId;
  const messageId = envelope.msg_id || envelope.messageId;
  
  if (roomId) {
    // Broadcast to WebSocket clients in the room
    broadcastToRoom(String(roomId), { 
      type: 'message', 
      id: messageId, 
      payload: envelope 
    });
    
    // Also publish to Redis for cross-server scenarios and other subscribers
    redis.publish(`room:${roomId}`, JSON.stringify(envelope));
  }
  
  // Send acknowledgment to sender
  ws.send(JSON.stringify({ type: 'msg_ack', msg_id: messageId }));
}

