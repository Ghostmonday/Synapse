/**
 * AIOps routes for autonomy integration
 */

import express from 'express';
import { LLMReasoner } from '../../autonomy/llm_reasoner.js';
import { Executor } from '../../autonomy/executor.js';
import { PolicyGuard } from '../../autonomy/policy_guard.js';
import { TelemetryCollector } from '../../autonomy/telemetry_collector.js';
import { getDeepSeekKey, getOpenAIKey } from '../../services/api-keys-service.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();
let reasoner: LLMReasoner | null = null;
const executor = new Executor();
const guard = new PolicyGuard();
const collector = new TelemetryCollector(process.env.PROMETHEUS_URL || 'http://prometheus:9090');

async function getReasoner(): Promise<LLMReasoner> {
  if (!reasoner) {
    // Try DeepSeek first, fallback to OpenAI
    try {
      const apiKey = await getDeepSeekKey();
      reasoner = new LLMReasoner(apiKey);
    } catch {
      try {
        const apiKey = await getOpenAIKey();
        reasoner = new LLMReasoner(apiKey);
      } catch {
        throw new Error('No LLM API key available in vault');
      }
    }
  }
  return reasoner;
}

const auditLogFile = path.join(process.cwd(), 'audit.log');

// GET /api/aiops/logs - Retrieve audit logs
router.get('/logs', async (req, res) => {
  try {
    if (fs.existsSync(auditLogFile)) {
      const logs = fs.readFileSync(auditLogFile, 'utf8');
      res.json({ logs });
    } else {
      res.json({ logs: '' });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// POST /api/aiops/controls - Trigger autonomy cycle
router.post('/controls', async (req, res) => {
  const { action } = req.body; // Optional manual action
  try {
    const telemetry = await collector.collect();
    const reasonerInstance = await getReasoner();
    const { reasoning, proposedActions } = await reasonerInstance.reason(telemetry);
    
    const approvedActions = proposedActions.filter(act => guard.validate(act));
    const results = [];
    for (const act of approvedActions) {
      const result = await executor.execute(act);
      results.push(result);
      fs.appendFileSync(auditLogFile, `${new Date().toISOString()} - Executed: ${act} - Result: ${result}\n`);
    }
    
    res.json({ reasoning, actions: results });
  } catch (error: any) {
    res.status(500).json({ error: 'Autonomy cycle failed', message: error.message });
  }
});

export default router;

