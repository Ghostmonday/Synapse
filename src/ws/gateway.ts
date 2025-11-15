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
import { handleReadReceipt } from './handlers/read-receipts.js';
import { 
  registerWebSocketToRoom, 
  unregisterWebSocket 
} from './utils.js';

// Protobuf schema root (loaded from .proto file)
// Null until schema is loaded
let root: protobuf.Root | null = null;

/**
 * Load protobuf schema definition
 * 
 * Protobuf provides efficient binary serialization for WebSocket messages.
 * Schema defines message structure (type, payload, etc.)
 */
async function loadProto() {
  if (!root) {
    // Load .proto file from specs directory
    // process.cwd() = project root (works in both dev and production builds)
    // Path is relative to project root: specs/proto/ws_envelope.proto
    root = await protobuf.load(path.join(process.cwd(), 'specs/proto/ws_envelope.proto'));
  }
}
// Load schema on module init (non-blocking - errors are warnings)
loadProto().catch(err => {
  // Silently fail - proto loading is optional
});

/**
 * Setup WebSocket gateway with protobuf message handling
 * 
 * Handles incoming WebSocket connections and routes messages based on type.
 * Uses protobuf for efficient binary message encoding/decoding.
 */
export function setupWebSocketGateway(wss: WebSocketServer) {
  // Listen for new WebSocket connections
  wss.on('connection', (ws: WebSocket & { alive?: number; pingTimeout?: NodeJS.Timeout }) => {
    // Mark connection as alive
    ws.alive = Date.now();
    
    // Ping-pong health check with debounce and jitter (29-31s)
    // Prevents queue storms under load by randomizing ping intervals
    const schedulePing = () => {
      // Clear any existing timeout
      if (ws.pingTimeout) {
        clearTimeout(ws.pingTimeout);
      }
      
      // Calculate jitter: base 30s + random -1s to +1s (29-31s range)
      const baseInterval = 30000; // 30 seconds
      const jitter = (Math.random() * 2000) - 1000; // -1000ms to +1000ms
      const interval = baseInterval + jitter;
      
      // Debounce: wrap ping in setTimeout with 5ms debounce
      ws.pingTimeout = setTimeout(() => {
        if (ws.readyState === ws.OPEN) {
          // Check if last pong was more than 1 minute ago
          if (ws.alive && Date.now() - ws.alive > 60000) {
            // Stale connection - close it
            ws.terminate();
            return;
          }
          
          // Send ping with 5ms debounce
          setTimeout(() => {
            if (ws.readyState === ws.OPEN) {
              ws.ping();
            }
          }, 5);
          
          // Schedule next ping
          schedulePing();
        }
      }, interval);
    };
    
    // Start ping cycle
    schedulePing();
    
    // Handle pong response
    ws.on('pong', () => {
      ws.alive = Date.now();
    });
    
    // Handle incoming messages on this connection
    ws.on('message', (data: Buffer) => {
      // Check if protobuf schema is loaded
      if (!root) {
        // Schema not loaded yet - reject message with error
        ws.send(JSON.stringify({ type: 'error', msg: 'proto not loaded' }));
        return;
      }
      
      // Look up the WSEnvelope type from loaded schema
      // 'sinaps.v1.WSEnvelope' is the fully qualified type name from .proto file
      const WSEnvelope = root!.lookupType('sinaps.v1.WSEnvelope');
      
      let envelope;
      try {
        // Decode binary protobuf message to JavaScript object
        // data is Buffer containing protobuf-encoded bytes
        envelope = WSEnvelope.decode(data);
      } catch (err) {
        // Decode failed - malformed message or wrong schema version
        ws.send(JSON.stringify({ type: 'error', msg: 'invalid envelope' }));
        return;
      }
      
      // Extract message type and room ID from decoded envelope
      const t = (envelope as any).type;
      const roomId = (envelope as any).room_id;
      
      // Register WebSocket to room for efficient broadcasting
      if (roomId && typeof roomId === 'string') {
        registerWebSocketToRoom(ws, roomId);
      }
      
      // Route message to appropriate handler based on type
      switch (t) {
        case 'presence': 
          // Presence updates (online/offline status)
          handlePresence(ws, envelope); 
          break;
        case 'messaging': 
          // Chat messages
          handleMessaging(ws, envelope); 
          break;
        case 'read_receipt':
          // Read receipts (delivered, read, seen)
          handleReadReceipt(ws, envelope);
          break;
        default: 
          // Unknown message type - send error back to client
          ws.send(JSON.stringify({ type: 'error', msg: 'unknown type' })); 
          break;
      }
    });
    
    // Clean up when connection closes
    ws.on('close', () => {
      if (ws.pingTimeout) {
        clearTimeout(ws.pingTimeout);
      }
      unregisterWebSocket(ws);
    });
    
    // Clean up on error
    ws.on('error', () => {
      if (ws.pingTimeout) {
        clearTimeout(ws.pingTimeout);
      }
      unregisterWebSocket(ws);
    });
  });
}

