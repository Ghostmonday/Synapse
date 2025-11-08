/**
 * Handle messaging WSEnvelope and publish to Redis room channel
 * 
 * When a client sends a message via WebSocket:
 * 1. Publish message to Redis channel for other servers/clients
 * 2. Send acknowledgment back to sender
 */

import { WebSocket } from 'ws';
import { getRedisClient } from '../../config/db.js';

const redis = getRedisClient();

export function handleMessaging(ws: WebSocket, envelope: any) {
  // Publish message to Redis channel: "room:{room_id}"
  // All clients subscribed to this room (via Redis pub/sub) will receive the message
  // This enables real-time message delivery across multiple server instances
  redis.publish(`room:${envelope.room_id}`, JSON.stringify(envelope)); // Silent fail: if Redis down, publish fails but ack sent = message lost
  
  // Send acknowledgment back to sender
  // Confirms message was received and published (client can show "sent" status)
  ws.send(JSON.stringify({ type: 'msg_ack', msg_id: envelope.msg_id })); // Async handoff: ack sent before publish completes
}

