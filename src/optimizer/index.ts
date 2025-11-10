/**
 * Optimizer worker — queries Prometheus, analyzes with OpenAI, posts recommendations
 *
 * This file is written as a standalone microservice.
 * Constraints:
 *  - Do not query Prometheus more than once per minute.
 *  - Log recommendations to Postgres via /admin/apply-recommendation endpoint.
 *
 * NOTE: openai.chat.completions usage shown here is illustrative; adapt to the OpenAI SDK you have.
 */

import OpenAI from 'openai';
import fetch from 'node-fetch';
import { llmParamManager } from '../services/llm-parameter-manager';
import { getOpenAIKey } from '../services/api-keys-service.js';

let client: OpenAI | null = null;

async function getClient(): Promise<OpenAI> {
  if (!client) {
    const apiKey = await getOpenAIKey();
    client = new OpenAI({ apiKey });
  }
  return client;
}

async function queryPrometheus() {
  const url = `${process.env.PROMETHEUS_URL}/api/v1/query?query=up`;
  const res = await fetch(url);
  return await res.json();
}

type RecommendationConfig = {
  config?: Record<string, unknown>;
  reason?: string;
  [key: string]: unknown;
};

async function analyzeWithOpenAI(metrics: Record<string, unknown>): Promise<RecommendationConfig> {
  // Get parameters from centralized config
  const models = llmParamManager.getModels();
  const temperature = llmParamManager.getTemperature();
  const tokenConfig = llmParamManager.getTokenConfig();
  
  // Ask the model to return strict JSON recommendation, e.g. {"config": {"max_conn": 200}, "reason": "..."}
  const system = 'You are an optimizer agent. Read metrics JSON and return a non-empty JSON recommendation object. Only output JSON.';
  const openaiClient = await getClient();
  const result = await openaiClient.chat.completions.create({
    model: models.optimizer, // Model from centralized config
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(metrics) }
    ],
    max_tokens: tokenConfig.maxTokensOptimizer, // Max tokens from centralized config
    temperature: temperature.optimizer // Temperature from centralized config
  });
  const content = (result as any).choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content) as RecommendationConfig;
    if (Object.keys(parsed).length === 0) throw new Error('Empty recommendation');
    return parsed;
  } catch (err) {
    throw new Error('OpenAI returned invalid JSON');
  }
}

async function postRecommendation(recommendation: RecommendationConfig): Promise<void> {
  await fetch(`${process.env.API_URL}/admin/apply-recommendation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ADMIN_API_KEY || ''}` },
    body: JSON.stringify({ recommendation })
  });
}

async function optimizeLoop() {
  while (true) {
    try {
      const metrics = await queryPrometheus();
      const recommendation = await analyzeWithOpenAI(metrics);
      await postRecommendation(recommendation);
      console.log('Posted recommendation', recommendation);
    } catch (err) {
      console.error('Optimizer error', err);
    }
    // throttle 60s
    await new Promise(r => setTimeout(r, 60000));
  }
}

optimizeLoop().catch(console.error);

