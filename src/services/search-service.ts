/**
 * Search Service
 * Full-text search across messages, rooms, and users
 * Uses PostgreSQL GIN indexes and RLS-safe RPC functions
 */

import { supabase } from '../config/db.js';
import { getRedisClient } from '../config/db.js';
import { logError, logInfo } from '../shared/logger.js';

const redis = getRedisClient();

export interface SearchResult {
  id: string;
  type: 'message' | 'room' | 'user';
  content: string;
  metadata: Record<string, any>;
  rank?: number;
}

export interface SearchOptions {
  query: string;
  type?: 'messages' | 'rooms' | 'users' | 'all';
  roomId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Full-text search across messages, rooms, and users
 */
export async function fullTextSearch(options: SearchOptions): Promise<SearchResult[]> {
  try {
    const { query, type = 'all', roomId, userId, limit = 50, offset = 0 } = options;

    if (!query || query.trim().length === 0) {
      return [];
    }

    // Cache key for Redis
    const cacheKey = `search:${type}:${query}:${roomId || 'all'}:${userId || 'all'}:${limit}:${offset}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const results: SearchResult[] = [];

    // Search messages
    if (type === 'all' || type === 'messages') {
      const { data: messages, error: msgError } = await supabase.rpc('search_messages_fulltext', {
        search_query: query,
        filter_room_id: roomId || null,
        filter_user_id: userId || null,
        result_limit: limit
      });

      if (msgError) {
        logError('Message search failed', msgError);
      } else if (messages) {
        results.push(...messages.map((m: any) => ({
          id: m.id,
          type: 'message' as const,
          content: m.content_preview || '',
          metadata: {
            room_id: m.room_id,
            sender_id: m.sender_id,
            created_at: m.created_at
          },
          rank: m.rank
        })));
      }
    }

    // Search rooms
    if (type === 'all' || type === 'rooms') {
      const { data: rooms, error: roomError } = await supabase.rpc('search_rooms_fulltext', {
        search_query: query,
        result_limit: limit
      });

      if (roomError) {
        logError('Room search failed', roomError);
      } else if (rooms) {
        results.push(...rooms.map((r: any) => ({
          id: r.id,
          type: 'room' as const,
          content: r.title || r.slug || '',
          metadata: {
            slug: r.slug,
            created_at: r.created_at
          },
          rank: r.rank
        })));
      }
    }

    // Search users (if users table has searchable fields)
    if (type === 'all' || type === 'users') {
      // Direct query since we don't have a dedicated RPC yet
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username, display_name')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(limit);

      if (userError) {
        logError('User search failed', userError);
      } else if (users) {
        results.push(...users.map((u: any) => ({
          id: u.id,
          type: 'user' as const,
          content: u.display_name || u.username || '',
          metadata: {
            username: u.username
          }
        })));
      }
    }

    // Sort by rank if available, then by relevance
    results.sort((a, b) => {
      if (a.rank && b.rank) {
        return b.rank - a.rank;
      }
      return 0;
    });

    // Cache results for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(results));

    logInfo(`Search completed: ${results.length} results for query "${query}"`);
    return results;
  } catch (error: any) {
    logError('Full-text search failed', error);
    return [];
  }
}

/**
 * Search messages in a specific room
 */
export async function searchRoomMessages(
  roomId: string,
  query: string,
  limit: number = 50
): Promise<SearchResult[]> {
  return fullTextSearch({
    query,
    type: 'messages',
    roomId,
    limit
  });
}

/**
 * Search public rooms
 */
export async function searchRooms(
  query: string,
  limit: number = 20
): Promise<SearchResult[]> {
  return fullTextSearch({
    query,
    type: 'rooms',
    limit
  });
}

