/**
 * LLM Proxy - DeepSeek endpoint proxy
 * Zero leakage - all requests go through Supabase Edge Function
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://sinapse.app",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// Sanitize prompt: strip HTML, escape backticks, cap at 4k tokens
function sanitizePrompt(prompt: string): string {
  // Remove HTML tags
  let sanitized = prompt.replace(/<[^>]*>/g, "");
  
  // Escape backticks
  sanitized = sanitized.replace(/`/g, "\\`");
  
  // Cap at 4k tokens (roughly 16k chars, using 4 chars per token estimate)
  const maxChars = 16000;
  if (sanitized.length > maxChars) {
    sanitized = sanitized.substring(0, maxChars);
  }
  
  return sanitized;
}

// Hash prompt for audit logging
async function hashPrompt(prompt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(prompt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { prompt, model = "deepseek-chat" } = body;

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize prompt
    const sanitizedPrompt = sanitizePrompt(prompt);
    const promptHash = await hashPrompt(sanitizedPrompt);

    // Log to audit_logs
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "llm_request",
      timestamp: new Date().toISOString(),
      metadata: {
        prompt_hash: promptHash,
        model,
        intent: body.intent || "unknown",
        prompt_length: sanitizedPrompt.length,
      },
    });

    // Proxy to DeepSeek
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekKey) {
      return new Response(
        JSON.stringify({ error: "LLM service unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: sanitizedPrompt }],
        temperature: 0,
      }),
    });

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

