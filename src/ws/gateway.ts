/**
 * WebSocket gateway using protobuf envelope
 * - uses specs/proto/ws_envelope.proto for decoding
 * - delegates to handlers based on envelope.type
 * - maintains room-based client tracking for efficient broadcasting
 */

import { WebSocketServer, WebSocket } from 'ws';
import protobuf from 'protobufjs';
import path from 'path';
import { handlePresence } from './handlers/presence.js';
import { handleMessaging } from './handlers/messaging.js';

let root: protobuf.Root | null = null;

// Room-based client tracking: maps roomId -> Set of WebSocket connections
const roomClientMap = new Map<string, Set<WebSocket>>();

async function loadProto() {
  if (!root) {
    // Use process.cwd() to get project root, works in both dev and production
    root = await protobuf.load(path.join(process.cwd(), 'specs/proto/ws_envelope.proto'));
  }
}
loadProto().catch(err => console.warn('proto load failed', err));

/**
 * Broadcast message to all clients in a specific room
 */
export function broadcastToRoom(roomId: string, message: any) {
  const clients = roomClientMap.get(roomId);
  if (!clients || clients.size === 0) return;
  
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

/**
 * Add WebSocket client to a room
 */
function addClientToRoom(ws: WebSocket, roomId: string) {
  if (!(ws as any).rooms) {
    (ws as any).rooms = new Set<string>();
  }
  
  (ws as any).rooms.add(roomId);
  
  if (!roomClientMap.has(roomId)) {
    roomClientMap.set(roomId, new Set());
  }
  roomClientMap.get(roomId)!.add(ws);
}

/**
 * Remove WebSocket client from a room
 */
function removeClientFromRoom(ws: WebSocket, roomId: string) {
  const clients = roomClientMap.get(roomId);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) {
      roomClientMap.delete(roomId);
    }
  }
  
  if ((ws as any).rooms) {
    (ws as any).rooms.delete(roomId);
  }
}

export function setupWebSocketGateway(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    // Initialize rooms set for this connection
    (ws as any).rooms = new Set<string>();
    
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
      
      // Track room membership from envelope
      const roomId = (envelope as any).room_id || (envelope as any).roomId;
      if (roomId) {
        addClientToRoom(ws, String(roomId));
      }
      
      const t = (envelope as any).type;
      switch (t) {
        case 'presence': handlePresence(ws, envelope); break;
        case 'messaging': handleMessaging(ws, envelope); break;
        default: ws.send(JSON.stringify({ type: 'error', msg: 'unknown type' })); break;
      }
    });
    
    ws.on('close', () => {
      // Clean up room memberships when connection closes
      const rooms = (ws as any).rooms as Set<string> | undefined;
      if (rooms) {
        for (const roomId of rooms) {
          removeClientFromRoom(ws, roomId);
        }
      }
    });
  });
}

