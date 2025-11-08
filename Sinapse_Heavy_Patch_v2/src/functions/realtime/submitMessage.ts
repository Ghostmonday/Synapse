// REPLACE the wss.clients.forEach block with:
broadcastToRoom(roomId, { type: 'message', id: messageId, payload: compressedPayload });
