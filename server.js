/**
 * Main server entry point
 * Loads environment variables and starts Express server
 */

import 'dotenv/config';
import express from 'express';
import http from 'http';
import client from 'prom-client';
import { supabase, getRedisClient } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import roomsRoutes from './src/routes/rooms.js';
import aiRoutes from './src/routes/ai.js';
import iapRoutes from './src/routes/iap.js';

const app = express();
const server = http.createServer(app);

// Collect default metrics
client.collectDefaultMetrics();

// Middleware
app.use(express.json());

// Health check
app.get('/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    await getRedisClient().ping();
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Test endpoint
app.get('/api/test', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) return res.status(500).json({ status: 'error', message: error.message });
    res.json({ status: 'ok', users_found: data?.length || 0 });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Demo-seed endpoint
app.post('/api/demo-seed', async (_req, res) => {
  try {
    // Demo user (handle duplicate username gracefully)
    let user;
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'DemoUser')
      .single();
    
    if (existingUser) {
      user = existingUser;
    } else {
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert([{ username: 'DemoUser', password: 'demo123' }])
        .select()
        .single();
      
      if (userErr) throw userErr;
      user = newUser;
    }

    // Demo room
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert([{ name: 'Demo Room', owner_id: user.id }])
      .select()
      .single();

    if (roomErr) throw roomErr;

    // Demo message
    const { error: msgErr } = await supabase
      .from('messages')
      .insert([{ room_id: room.id, user_id: user.id, content: 'Hello from Sinapse backend!' }]);

    if (msgErr) throw msgErr;

    res.json({
      status: 'ok',
      user_id: user.id,
      room_id: room.id,
      message: 'Demo data seeded successfully'
    });
  } catch (e) {
    console.error('❌ Demo-seed error:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/rooms', roomsRoutes);
app.use('/ai', aiRoutes);
app.use('/iap', iapRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

