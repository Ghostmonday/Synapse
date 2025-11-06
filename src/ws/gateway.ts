/**
 * WebSocket gateway using protobuf envelope
 * - uses specs/proto/ws_envelope.proto for decoding
 * - delegates to handlers based on envelope.type
 */

import { WebSocketServer, WebSocket } from 'ws';
import protobuf from 'protobufjs';
import path from 'path';
import { handlePresence } from './handlers/presence.js';
import { handleMessaging } from './handlers/messaging.js';

let root: protobuf.Root | null = null;

async function loadProto() {
  if (!root) {
    // Use process.cwd() to get project root, works in both dev and production
    root = await protobuf.load(path.join(process.cwd(), 'specs/proto/ws_envelope.proto'));
  }
}
loadProto().catch(err => console.warn('proto load failed', err));

export function setupWebSocketGateway(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data: Buffer) => {
      if (!root) {
        ws.send(JSON.stringify({ type: 'error', msg: 'proto not loaded' }));
        return;
      }
      const WSEnvelope = root!.lookupType('sinaps.v1.WSEnvelope');
      let envelope;
      try {
        envelope = WSEnvelope.decode(data);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', msg: 'invalid envelope' }));
        return;
      }
      const t = (envelope as any).type;
      switch (t) {
        case 'presence': handlePresence(ws, envelope); break;
        case 'messaging': handleMessaging(ws, envelope); break;
        default: ws.send(JSON.stringify({ type: 'error', msg: 'unknown type' })); break;
      }
    });
  });
}

