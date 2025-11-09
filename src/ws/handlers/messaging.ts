/**
 * Handle messaging WSEnvelope and publish to Redis room channel
 * 
 * When a client sends a message via WebSocket:
 * 1. Publish message to Redis channel for other servers/clients
 * 2. Send acknowledgment back to sender
 */

import { WebSocket } from 'ws';
import { getRedisClient } from '../../config/db.js';
import { broadcastToRoom } from '../utils.js';

const redis = getRedisClient();

export function handleMessaging(ws: WebSocket, envelope: any) {
  // Broadcast message to room using optimized WebSocket utility
  // Uses direct WebSocket broadcast for efficiency, falls back to Redis pub/sub
  broadcastToRoom(
    envelope.room_id, 
    { type: 'message', id: envelope.msg_id, payload: envelope.payload },
    true // Use direct broadcast for efficiency
  );
  
  // Send acknowledgment back to sender
  // Confirms message was received and published (client can show "sent" status)
  ws.send(JSON.stringify({ type: 'msg_ack', msg_id: envelope.msg_id })); // Async handoff: ack sent before publish completes
}

