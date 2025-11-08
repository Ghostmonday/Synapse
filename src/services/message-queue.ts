/**
 * Message Queue Service
 * Implements Bull queue for reliable message processing with retries and back-pressure
 */

import Queue from 'bull';
import { getRedisClient } from '../config/db.js';
import { logError, logInfo } from '../shared/logger.js';
import * as messageService from './message-service.js';

const redisClient = getRedisClient();

// Create message queue with rate limiting
// Bull uses Redis URL directly or connection object
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const messageQueue = new Queue('message-delivery', {
  redis: redisUrl,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
  settings: {
    maxStalledCount: 1, // Prevent duplicate processing
    stalledInterval: 30000, // Check for stalled jobs every 30s
  },
  limiter: {
    max: 1000, // Max 1000 jobs per interval
    duration: 1000, // Per second
  },
});

// Process message jobs
messageQueue.process('send-message', async (job) => {
  const { roomId, senderId, content } = job.data;
  
  logInfo(`Processing message job ${job.id} for room ${roomId}`);
  
  try {
    await messageService.sendMessageToRoom({
      roomId,
      senderId,
      content,
    });
    
    logInfo(`Message job ${job.id} completed successfully`);
    return { success: true, messageId: job.id };
  } catch (error: any) {
    logError(`Message job ${job.id} failed`, error);
    throw error; // Will trigger retry
  }
});

// Queue event handlers
messageQueue.on('completed', (job) => {
  logInfo(`Message job ${job.id} completed`);
});

messageQueue.on('failed', (job, err) => {
  logError(`Message job ${job.id} failed after ${job.attemptsMade} attempts`, err);
});

messageQueue.on('stalled', (job) => {
  logError(`Message job ${job.id} stalled`);
});

messageQueue.on('error', (error) => {
  logError('Message queue error', error);
});

/**
 * Add message to queue
 */
export async function queueMessage(data: {
  roomId: string | number;
  senderId: string;
  content: string;
}): Promise<{ jobId: string; status: string }> {
  try {
    // Check queue depth before adding
    const waiting = await messageQueue.getWaitingCount();
    const active = await messageQueue.getActiveCount();
    
    if (waiting + active > 10000) {
      throw new Error('Message queue is overloaded. Please try again later.');
    }
    
    const job = await messageQueue.add('send-message', data, {
      priority: 1, // Normal priority
      delay: 0,
    });
    
    return {
      jobId: job.id.toString(),
      status: 'queued',
    };
  } catch (error: any) {
    logError('Failed to queue message', error);
    throw error;
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    messageQueue.getWaitingCount(),
    messageQueue.getActiveCount(),
    messageQueue.getCompletedCount(),
    messageQueue.getFailedCount(),
    messageQueue.getDelayedCount(),
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clean up old jobs
 */
export async function cleanupQueue() {
  try {
    await messageQueue.clean(3600000, 'completed', 1000); // Clean completed jobs older than 1 hour
    await messageQueue.clean(86400000, 'failed', 100); // Clean failed jobs older than 24 hours
    logInfo('Queue cleanup completed');
  } catch (error: any) {
    logError('Queue cleanup failed', error);
  }
}

// Periodic cleanup (every hour)
setInterval(cleanupQueue, 3600000);

