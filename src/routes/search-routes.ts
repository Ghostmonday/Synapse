import express from 'express';
import { supabase } from '../config/db.js';
import { getRedisClient } from '../config/db.js';
import { authMiddleware as authenticate } from '../server/middleware/auth.js';
import { generateEmbedding } from '../services/embeddings-service.js';
import { logAudit } from '../shared/logger.js';

const router = express.Router();
const redis = getRedisClient();

router.get('/', authenticate, async (req, res) => {
  const { query, room_id } = req.query;
  const cacheKey = `search:${query}:${room_id}`;
  let results = await redis.get(cacheKey);
  if (results) return res.json(JSON.parse(results));

  try {
    const embedding = await generateEmbedding(query as string);
    const { data: semantic } = await supabase.rpc('match_messages', {
      query_embedding: embedding,
      match_threshold: 0.78,
      match_count: 10,
      filter_room_id: room_id,
    });
    // Hybrid search: combine semantic with keyword search
    const { data: keyword } = await supabase.from('messages').select().textSearch('content', query as string).eq('room_id', room_id);
    results = [...new Set([...semantic || [], ...keyword || []])]; // Merge unique
    await redis.set(cacheKey, JSON.stringify(results), 'EX', 600);
    await logAudit('search', req.user.id, { query });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;

