import { supabase } from '../config/db.js';

export async function logMetric(type: string, value: number): Promise<void> {
  await supabase.from('metrics').insert({ type, value });
}

export async function getAnalytics(type: string, start: string, end: string): Promise<any[]> {
  const { data } = await supabase.from('metrics').select('*').eq('type', type).gte('timestamp', start).lte('timestamp', end);
  return data || [];
}

