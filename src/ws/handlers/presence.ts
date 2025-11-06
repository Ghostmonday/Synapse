/**
 * Handle presence WSEnvelope
 */

import { WebSocket } from 'ws';
import { updatePresence } from '../../server/services/presence.js';

export function handlePresence(ws: WebSocket, envelope: any) {
  const senderId = envelope.sender_id || envelope.senderId;
  updatePresence(senderId, 'online').catch(console.error);
  ws.send(JSON.stringify({ type: 'presence_ack', msg_id: envelope.msg_id }));
}

