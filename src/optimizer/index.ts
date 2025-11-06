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

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

async function queryPrometheus() {
  const url = `${process.env.PROMETHEUS_URL}/api/v1/query?query=up`;
  const res = await fetch(url);
  return await res.json();
}

async function analyzeWithOpenAI(metrics: any) {
  // Ask the model to return strict JSON recommendation, e.g. {"config": {"max_conn": 200}, "reason": "..."}
  const system = 'You are an optimizer agent. Read metrics JSON and return a non-empty JSON recommendation object. Only output JSON.';
  const result = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(metrics) }
    ],
    max_tokens: 800,
    temperature: 0.0
  });
  const content = (result as any).choices?.[0]?.message?.content || '{}';
  try {
    const parsed = JSON.parse(content);
    if (Object.keys(parsed).length === 0) throw new Error('Empty recommendation');
    return parsed;
  } catch (err) {
    throw new Error('OpenAI returned invalid JSON');
  }
}

async function postRecommendation(recommendation: any) {
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

