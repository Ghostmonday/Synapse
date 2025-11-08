/**
 * Type definitions for autonomy system
 */

/**
 * TelemetryEvent type based on Supabase schema
 */
export type TelemetryEvent = {
  id: string;
  room_id: string | null;
  user_id: string | null;
  event_time: string; // ISO timestamp
  event: 'message_stall' | 'chat_deadlock' | 'spam_burst' | string;
  risk: number | null;
  action: string | null;
  features: Record<string, unknown> | null;
  latency_ms: number | null;
  precision_recall: Record<string, unknown> | null;
};

/**
 * Prediction output from LLM
 */
export type PredictionOutput = {
  failures: string[];
  recommendations: string;
  reasoning?: string;
  proposedActions?: string[];
};

/**
 * Predicts potential failures from telemetry events.
 * @param events - Array of telemetry events to analyze.
 * @returns Array of predicted failure strings.
 */
export function predictFailures(events: TelemetryEvent[]): string[] {
  const failures: string[] = [];
  
  for (const event of events) {
    if (event.event === 'message_stall' && event.latency_ms && event.latency_ms > 5000) {
      failures.push(`Message stall detected in room ${event.room_id} with latency ${event.latency_ms}ms`);
    }
    if (event.event === 'chat_deadlock') {
      failures.push(`Chat deadlock detected in room ${event.room_id}`);
    }
    if (event.event === 'spam_burst' && event.risk && event.risk > 0.7) {
      failures.push(`Spam burst detected in room ${event.room_id} with risk ${event.risk}`);
    }
  }
  
  return failures;
}

