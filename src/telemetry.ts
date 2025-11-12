import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_KEY || "");

export async function logEvent(eventType: string, data: any): Promise<void> {
  await supabase.from("events").insert([{ type: eventType, data, timestamp: Date.now() }]);
}

