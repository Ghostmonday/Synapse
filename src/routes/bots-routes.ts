import express from 'express';
import { supabase } from '../config/db.js';
import { authMiddleware as authenticate } from '../server/middleware/auth.js';
import { logAudit } from '../shared/logger.js';
import { broadcastToRoom } from '../ws/utils.js';

const router = express.Router();

router.post('/register', authenticate, async (req, res) => {
  const { name, url } = req.body;
  
  // Input validation
  if (!name || !url) {
    return res.status(400).json({ error: 'name and url are required' });
  }
  
  if (typeof name !== 'string' || name.length > 255) {
    return res.status(400).json({ error: 'name must be a string under 255 characters' });
  }
  
  if (typeof url !== 'string' || !url.match(/^https?:\/\/.+/)) {
    return res.status(400).json({ error: 'url must be a valid HTTP/HTTPS URL' });
  }

  try {
    const { data, error } = await supabase
      .from('bots')
      .insert({ name, url, created_by: req.user.id })
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Bot with this name already exists' });
      }
      throw error;
    }
    
    await logAudit('bot_register', req.user.id, { bot_id: data.id });
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register bot', details: error.message });
  }
});

router.get('/list', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('bots').select('*').eq('created_by', req.user.id);
    res.json(data);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { data } = await supabase.from('bots').delete().eq('id', id).eq('created_by', req.user.id);
    if (!data) return res.status(404).json({ error: 'Bot not found' });
    await logAudit('bot_delete', req.user.id, { bot_id: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

router.post('/commands', authenticate, async (req, res) => {
  const { command, room_id } = req.body;
  try {
    // Validate bot token in header for bot auth
    const token = req.headers['x-bot-token'];
    const { data: bot } = await supabase.from('bots').select('*').eq('token', token).single();
    if (!bot) return res.status(401).json({ error: 'Invalid bot token' });
    // Handle command (e.g., post message)
    const response = { type: 'bot_response', content: `Handled ${command}` };
    broadcastToRoom(room_id, response);
    await logAudit('bot_command', req.user.id, { command, bot_id: bot.id });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Command failed' });
  }
});

export default router;

