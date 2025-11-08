// REPLACE the estimatedTimeToJoin line and add TTL
const estimatedTimeToJoin = typingCadence > 0 ? Math.max(500, 8000 / typingCadence) : Infinity;

// AFTER redis.hset:
await redis.hset(ROOM_HEATMAP_KEY, roomId, prob);
await redis.expire(ROOM_HEATMAP_KEY, 3600); // 1hr max age
