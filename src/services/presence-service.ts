import { getRedisClient } from '../config/db.js';
import { supabase } from '../config/db.js';
import { logAudit } from '../shared/logger.js';

const redis = getRedisClient();

export async function updateRoomPresence(roomId: string, userId: string, status: string): Promise<void> {
  await redis.hset(`presence:${roomId}`, userId, status);
  await supabase.from('presence_logs').insert({ user_id: userId, room_id: roomId, status });
  await logAudit('presence_update', userId, { room_id: roomId, status });
}

export async function getRoomPresence(roomId: string): Promise<Record<string, string>> {
  return await redis.hgetall(`presence:${roomId}`);
}

export async function getOnlineStatus(userId: string): Promise<string> {
  const keys = await redis.keys('presence:*');
  for (const key of keys) {
    const status = await redis.hget(key, userId);
    if (status) return status;
  }
  return 'offline';
}

export async function listRooms(): Promise<any[]> {
  const { data } = await supabase.from('rooms').select('*').eq('is_public', true).order('active_users', { ascending: false });
  return data || [];
}

export async function getActivityFeed(userId: string): Promise<any[]> {
  const { data } = await supabase
    .from('messages')
    .select('*, rooms(*)')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}
