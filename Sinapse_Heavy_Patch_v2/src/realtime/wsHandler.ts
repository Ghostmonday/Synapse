// Add near top
const roomClientMap = new Map<string, Set<WebSocket>>();

// In connection handler
wss.on('connection', (ws: any) => {
  ws.rooms = new Set<string>();

  ws.on('message', async (msg: string) => {
    const data = JSON.parse(msg);
    if (data.roomId) ws.rooms.add(data.roomId);
    // ... existing
  });

  ws.on('close', () => {
    for (const roomId of ws.rooms) {
      const clients = roomClientMap.get(roomId);
      clients?.delete(ws);
      if (clients?.size === 0) roomClientMap.delete(roomId);
    }
  });
});

// REPLACE any wss.clients.forEach(...) broadcast with:
function broadcastToRoom(roomId: string, message: any) {
  const clients = roomClientMap.get(roomId);
  if (!clients) return;
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
