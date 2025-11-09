/**
 * Moderation Service Tests
 * Tests for AI-powered content moderation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { scanForToxicity, handleViolation, isUserMuted } from '../src/services/moderation.service.js';
import { supabase } from '../src/config/db.js';

// Mock Supabase
jest.mock('../src/config/db.js', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock axios for Edge Function calls
jest.mock('axios', () => ({
  post: jest.fn(),
}));

describe('Moderation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scanForToxicity', () => {
    it('should return safe result for clean content', async () => {
      const axios = require('axios');
      axios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: '{"score": 0.1, "isToxic": false, "suggestion": ""}'
            }
          }]
        }
      });

      const result = await scanForToxicity('Hello, how are you?', 'room-123');
      
      expect(result.isToxic).toBe(false);
      expect(result.score).toBeLessThan(0.7);
    });

    it('should flag toxic content', async () => {
      const axios = require('axios');
      axios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: '{"score": 0.9, "isToxic": true, "suggestion": "Please keep conversations respectful"}'
            }
          }]
        }
      });

      const result = await scanForToxicity('hateful content here', 'room-123');
      
      expect(result.isToxic).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.suggestion).toBeTruthy();
    });

    it('should handle API failures gracefully', async () => {
      const axios = require('axios');
      axios.post.mockRejectedValue(new Error('API Error'));

      const result = await scanForToxicity('test content', 'room-123');
      
      // Should fail-safe and return safe result
      expect(result.isToxic).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should sanitize prompts before sending', async () => {
      const axios = require('axios');
      axios.post.mockResolvedValue({
        data: {
          choices: [{
            message: {
              content: '{"score": 0, "isToxic": false, "suggestion": ""}'
            }
          }]
        }
      });

      await scanForToxicity('test content with <script>alert("xss")</script>', 'room-123');
      
      // Verify sanitization happened (check that axios was called)
      expect(axios.post).toHaveBeenCalled();
      const callArgs = axios.post.mock.calls[0];
      expect(callArgs[1].prompt).not.toContain('<script>');
    });
  });

  describe('handleViolation', () => {
    it('should send warning on first violation', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null })
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      });

      (supabase.from as jest.Mock) = mockFrom;

      await handleViolation('user-123', 'room-123', 'Please be respectful', 0);

      // Should insert warning message
      expect(mockFrom).toHaveBeenCalledWith('messages');
      // Should upsert violation count
      expect(mockFrom).toHaveBeenCalledWith('message_violations');
    });

    it('should mute user after multiple violations', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { count: 2 } })
            })
          })
        }),
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({})
          })
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      await handleViolation('user-123', 'room-123', 'Please be respectful', 2);

      // Should create mute
      expect(mockFrom).toHaveBeenCalledWith('user_mutes');
    });
  });

  describe('isUserMuted', () => {
    it('should return false if user is not muted', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null })
            })
          })
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await isUserMuted('user-123', 'room-123');
      
      expect(result).toBe(false);
    });

    it('should return true if user is muted', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { muted_until: futureDate }
              })
            })
          })
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await isUserMuted('user-123', 'room-123');
      
      expect(result).toBe(true);
    });

    it('should clean up expired mutes', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { muted_until: pastDate }
              })
            })
          })
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({})
          })
        }),
      });

      (supabase.from as jest.Mock) = mockFrom;

      const result = await isUserMuted('user-123', 'room-123');
      
      expect(result).toBe(false);
      // Should delete expired mute
      expect(mockFrom).toHaveBeenCalledWith('user_mutes');
    });
  });
});

