/**
 * Handle messaging WSEnvelope and publish to Redis room channel
 */

import { WebSocket } from 'ws';
import { getRedisClient } from '../../config/db.js';

const redis = getRedisClient();

export function handleMessaging(ws: WebSocket, envelope: any) {
  redis.publish(`room:${envelope.room_id}`, JSON.stringify(envelope));
  ws.send(JSON.stringify({ type: 'msg_ack', msg_id: envelope.msg_id }));
}

