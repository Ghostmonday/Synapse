/**
 * Messages Controller
 * Handles reactions, threads, and message management
 */

import { Request, Response } from 'express';
import { supabase } from '../config/db.js';
import { redisPublisher } from '../config/redis-pubsub.js';
import { recordTelemetryEvent } from './telemetry-service.js';
import { logError, logInfo } from '../shared/logger.js';
import type { MessageReaction, ReactionUpdate, CreateThreadRequest, Thread } from '../types/message.types.js';

export class MessagesController {
  /**
   * SIN-202: Add or toggle reaction
   */
  async addReaction(req: Request, res: Response): Promise<void> {
    try {
      const { message_id } = req.params;
      const { emoji, user_id } = req.body;

      if (!message_id || typeof message_id !== 'string') {
        res.status(400).json({ error: 'Invalid message_id' });
        return;
      }

      if (!emoji || typeof emoji !== 'string') {
        res.status(400).json({ error: 'Invalid emoji' });
        return;
      }

      if (!user_id || typeof user_id !== 'string') {
        res.status(400).json({ error: 'Invalid user_id' });
        return;
      }

      // Get current message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('reactions, room_id')
        .eq('id', message_id)
        .single();

      if (messageError || !message) {
        logError('Error fetching message for reaction', messageError);
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      const currentReactions: MessageReaction[] = (message.reactions as MessageReaction[]) || [];
      let updatedReactions: MessageReaction[] = [...currentReactions];
      let action: 'add' | 'remove' = 'add';

      // Check if reaction already exists
      const existingReactionIndex = currentReactions.findIndex(r => r.emoji === emoji);

      if (existingReactionIndex >= 0) {
        // Reaction exists - toggle user
        const existingReaction = currentReactions[existingReactionIndex];
        const userIndex = existingReaction.user_ids.indexOf(user_id);

        if (userIndex >= 0) {
          // User already reacted - remove
          existingReaction.user_ids.splice(userIndex, 1);
          existingReaction.count -= 1;
          action = 'remove';

          // Remove reaction if no users left
          if (existingReaction.count === 0) {
            updatedReactions = currentReactions.filter(r => r.emoji !== emoji);
          } else {
            updatedReactions[existingReactionIndex] = existingReaction;
          }
        } else {
          // Add user to reaction
          existingReaction.user_ids.push(user_id);
          existingReaction.count += 1;
          updatedReactions[existingReactionIndex] = existingReaction;
        }
      } else {
        // New reaction
        const newReaction: MessageReaction = {
          emoji,
          user_ids: [user_id],
          count: 1,
        };
        updatedReactions.push(newReaction);
      }

      // Update message
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          reactions: updatedReactions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', message_id);

      if (updateError) {
        logError('Error updating message reactions', updateError);
        throw updateError;
      }

      // Broadcast reaction update
      const reactionUpdate: ReactionUpdate = {
        message_id,
        reaction: updatedReactions.find(r => r.emoji === emoji) || {
          emoji,
          user_ids: [],
          count: 0,
        },
        action,
        user_id,
      };

      try {
        await redisPublisher.publish(
          'reaction_updates',
          JSON.stringify({
            type: 'reaction_update',
            room_id: message.room_id,
            data: reactionUpdate,
          })
        );
      } catch (publishError) {
        logError('Failed to publish reaction update', publishError);
        // Continue without failing
      }

      // Log telemetry
      try {
        await recordTelemetryEvent('reaction_added', {
          room_id: message.room_id,
          user_id,
        });
      } catch (telemetryError) {
        logError('Failed to log telemetry for reaction', telemetryError);
      }

      res.json({ success: true, reactions: updatedReactions, action });
    } catch (error: any) {
      logError('Add reaction error', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  }

  /**
   * SIN-302: Create thread
   */
  async createThread(req: Request, res: Response): Promise<void> {
    try {
      const { parent_message_id, title, initial_message }: CreateThreadRequest = req.body;
      const user_id = (req as any).user?.id;

      if (!parent_message_id || typeof parent_message_id !== 'string') {
        res.status(400).json({ error: 'Invalid parent_message_id' });
        return;
      }

      if (!user_id || typeof user_id !== 'string') {
        res.status(401).json({ error: 'Unauthorized: Missing user_id' });
        return;
      }

      // Get parent message to get room_id
      const { data: parentMessage, error: messageError } = await supabase
        .from('messages')
        .select('room_id, content_preview')
        .eq('id', parent_message_id)
        .single();

      if (messageError || !parentMessage) {
        logError('Error fetching parent message', messageError);
        res.status(404).json({ error: 'Parent message not found' });
        return;
      }

      // Create thread
      const threadTitle = title || `Thread: ${(parentMessage.content_preview || '').substring(0, 50)}...`;
      const { data: thread, error: threadError } = await supabase
        .from('threads')
        .insert({
          parent_message_id,
          room_id: parentMessage.room_id,
          title: threadTitle,
          created_by: user_id,
        })
        .select()
        .single();

      if (threadError || !thread) {
        logError('Error creating thread', threadError);
        throw threadError || new Error('Failed to create thread');
      }

      // Create initial thread message if provided
      if (initial_message) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            room_id: parentMessage.room_id,
            sender_id: user_id,
            content_preview: initial_message,
            thread_id: thread.id,
          });

        if (messageError) {
          logError('Error creating initial message', messageError);
          // Don't fail the thread creation
        }
      }

      // Broadcast thread creation
      try {
        await redisPublisher.publish(
          'thread_updates',
          JSON.stringify({
            type: 'thread_created',
            room_id: parentMessage.room_id,
            data: thread,
          })
        );
      } catch (publishError) {
        logError('Failed to publish thread creation', publishError);
      }

      // Log telemetry
      try {
        await recordTelemetryEvent('thread_created', {
          room_id: parentMessage.room_id,
          user_id,
        });
      } catch (telemetryError) {
        logError('Failed to log telemetry for thread', telemetryError);
      }

      res.status(201).json({ success: true, thread });
    } catch (error: any) {
      logError('Create thread error', error);
      res.status(500).json({ error: 'Failed to create thread' });
    }
  }

  /**
   * SIN-302: Get thread with messages
   */
  async getThread(req: Request, res: Response): Promise<void> {
    try {
      const { thread_id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      if (!thread_id || typeof thread_id !== 'string') {
        res.status(400).json({ error: 'Invalid thread_id' });
        return;
      }

      const offset = (page - 1) * limit;

      // Get thread info
      const { data: thread, error: threadError } = await supabase
        .from('threads')
        .select('*, parent_message:messages(*)')
        .eq('id', thread_id)
        .single();

      if (threadError || !thread) {
        logError('Error fetching thread', threadError);
        res.status(404).json({ error: 'Thread not found' });
        return;
      }

      // Get thread messages with pagination
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*, user:users(handle, display_name)')
        .eq('thread_id', thread_id)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (messagesError) {
        logError('Error fetching thread messages', messagesError);
        throw messagesError;
      }

      res.json({
        success: true,
        thread,
        messages: messages || [],
        pagination: {
          page,
          limit,
          has_more: (messages?.length || 0) === limit,
        },
      });
    } catch (error: any) {
      logError('Get thread error', error);
      res.status(500).json({ error: 'Failed to fetch thread' });
    }
  }

  /**
   * SIN-302: Get room threads
   */
  async getRoomThreads(req: Request, res: Response): Promise<void> {
    try {
      const { room_id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (!room_id || typeof room_id !== 'string') {
        res.status(400).json({ error: 'Invalid room_id' });
        return;
      }

      const offset = (page - 1) * limit;

      const { data: threads, error, count } = await supabase
        .from('threads')
        .select('*, parent_message:messages(content_preview)', { count: 'exact' })
        .eq('room_id', room_id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logError('Error fetching room threads', error);
        throw error;
      }

      res.json({
        success: true,
        threads: threads || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          has_more: (count || 0) > offset + limit,
        },
      });
    } catch (error: any) {
      logError('Get room threads error', error);
      res.status(500).json({ error: 'Failed to fetch room threads' });
    }
  }

  /**
   * SIN-401: Edit message
   */
  async editMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message_id } = req.params;
      const { content, user_id } = req.body;

      if (!message_id || typeof message_id !== 'string') {
        res.status(400).json({ error: 'Invalid message_id' });
        return;
      }

      if (!content || typeof content !== 'string') {
        res.status(400).json({ error: 'Invalid content' });
        return;
      }

      if (!user_id || typeof user_id !== 'string') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get current message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('sender_id, room_id, content_preview')
        .eq('id', message_id)
        .single();

      if (messageError || !message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      // Verify ownership
      if (message.sender_id !== user_id) {
        res.status(403).json({ error: 'Not authorized to edit this message' });
        return;
      }

      // Check 24-hour edit window
      const { data: messageWithTime } = await supabase
        .from('messages')
        .select('created_at')
        .eq('id', message_id)
        .single();

      if (messageWithTime) {
        const createdAt = new Date(messageWithTime.created_at);
        const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) {
          res.status(400).json({ error: 'Message can only be edited within 24 hours' });
          return;
        }
      }

      // Update message (trigger will handle edit_history)
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content_preview: content.substring(0, 512),
          updated_at: new Date().toISOString(),
        })
        .eq('id', message_id);

      if (updateError) {
        logError('Error updating message', updateError);
        throw updateError;
      }

      // Broadcast edit
      try {
        await redisPublisher.publish(
          'message_updates',
          JSON.stringify({
            type: 'message_edited',
            room_id: message.room_id,
            data: { message_id, content },
          })
        );
      } catch (publishError) {
        logError('Failed to publish message edit', publishError);
      }

      res.json({ success: true, message_id });
    } catch (error: any) {
      logError('Edit message error', error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  }

  /**
   * SIN-401: Delete message
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message_id } = req.params;
      const user_id = (req as any).user?.id;

      if (!message_id || typeof message_id !== 'string') {
        res.status(400).json({ error: 'Invalid message_id' });
        return;
      }

      if (!user_id || typeof user_id !== 'string') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Get message to verify ownership and get room_id
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('sender_id, room_id, created_at')
        .eq('id', message_id)
        .single();

      if (messageError || !message) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }

      // Verify ownership or admin
      if (message.sender_id !== user_id) {
        // Check if user is admin/mod (would need to check room_memberships)
        res.status(403).json({ error: 'Not authorized to delete this message' });
        return;
      }

      // Check 24-hour deletion window
      const createdAt = new Date(message.created_at);
      const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation > 24) {
        res.status(400).json({ error: 'Message can only be deleted within 24 hours' });
        return;
      }

      // Delete message
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', message_id);

      if (deleteError) {
        logError('Error deleting message', deleteError);
        throw deleteError;
      }

      // Broadcast deletion
      try {
        await redisPublisher.publish(
          'message_updates',
          JSON.stringify({
            type: 'message_deleted',
            room_id: message.room_id,
            data: { message_id },
          })
        );
      } catch (publishError) {
        logError('Failed to publish message deletion', publishError);
      }

      res.json({ success: true, message_id });
    } catch (error: any) {
      logError('Delete message error', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  }

  /**
   * SIN-402: Search messages
   */
  async searchMessages(req: Request, res: Response): Promise<void> {
    try {
      const { q, room_id } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        res.status(400).json({ error: 'Invalid search query' });
        return;
      }

      const offset = (page - 1) * limit;

      // Build query
      let query = supabase
        .from('message_search_index')
        .select('*')
        .textSearch('search_vector', q, {
          type: 'websearch',
          config: 'english',
        });

      if (room_id && typeof room_id === 'string') {
        query = query.eq('room_id', room_id);
      }

      const { data: results, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Get count separately
      const { count: totalCount } = await supabase
        .from('message_search_index')
        .select('*', { count: 'exact', head: true })
        .textSearch('search_vector', q, {
          type: 'websearch',
          config: 'english',
        });

      if (error) {
        logError('Error searching messages', error);
        throw error;
      }

      res.json({
        success: true,
        results: results || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          has_more: (count || 0) > offset + limit,
        },
      });
    } catch (error: any) {
      logError('Search messages error', error);
      res.status(500).json({ error: 'Failed to search messages' });
    }
  }
}

export const messagesController = new MessagesController();

