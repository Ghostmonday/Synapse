/**
 * System Ops Handler
 * Processes system metrics (CPU, Redis, DB locks)
 * 
 * Constraints:
 * - Receives Prometheus JSON format: {timestamp, metric_name, value}
 * - Analyzes stats only
 * - Outputs remediation PHRASES only - NO commands
 * - Escalates to human operator
 */

import { getDeepSeekKey } from '../api-keys-service.js';
import { logError, logWarning } from '../../shared/logger.js';
import axios from 'axios';

export interface PrometheusMetric {
  timestamp: string;
  metric_name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface SystemOpsAnalysis {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  remediations: string[]; // Phrases only, no commands
  escalation_required: boolean;
}

/**
 * Analyze system metrics from Prometheus
 * Outputs remediation phrases only - no commands
 */
export async function analyzeSystemOps(
  metrics: PrometheusMetric[]
): Promise<SystemOpsAnalysis> {
  try {
    const deepseekKey = await getDeepSeekKey();
    if (!deepseekKey) {
      logWarning('DeepSeek API key not found - system ops analysis disabled');
      return {
        status: 'healthy',
        issues: [],
        remediations: [],
        escalation_required: false
      };
    }

    // Format metrics as Prometheus JSON
    const metricsJson = JSON.stringify(metrics, null, 2);
    
    // Strict prompt: remediation phrases only, no commands
    const prompt = `Analyze these Prometheus metrics. Metrics are in JSON format: {timestamp, metric_name, value}.

Metrics:
${metricsJson}

Rules:
- If redis_memory_used > 90%, output: REMEDIATION: "resize cache"
- If cpu_usage > 85%, output: REMEDIATION: "scale compute"
- If db_connections > 80% of max, output: REMEDIATION: "increase connection pool"
- If latency_p95 > threshold, output: REMEDIATION: "optimize queries"

Output JSON ONLY in this format:
{
  "status": "healthy" | "warning" | "critical",
  "issues": ["issue1", "issue2"],
  "remediations": ["REMEDIATION: phrase1", "REMEDIATION: phrase2"],
  "escalation_required": true/false
}

CRITICAL RULES:
- Output ONLY remediation phrases (e.g., "resize cache", "scale compute")
- NO shell commands
- NO scripts
- NO sudo
- NO system commands
- NO executable code
- If critical, set escalation_required: true
- Phrases should be human-readable actions, not commands`;

    // Use Supabase Edge Function proxy
    const { getSupabaseKeys } = await import('../api-keys-service.js');
    const supabaseKeys = await getSupabaseKeys();
    const supabaseUrl = supabaseKeys.url;
    const supabaseAnonKey = supabaseKeys.anonKey;

    const response = await axios.post(
      `${supabaseUrl}/functions/v1/llm-proxy`,
      {
        prompt,
        model: 'deepseek-chat',
        intent: 'system_ops_analysis',
      },
      {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content?.trim() || '{}';
    
    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON from markdown or text
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response');
      }
    }

    // Validate and sanitize remediations
    const remediations = Array.isArray(parsed.remediations) ? parsed.remediations : [];
    const sanitizedRemediations = remediations.map((r: string) => {
      const str = String(r).toLowerCase();
      // Remove any command-like patterns
      const forbiddenPatterns = [
        /sudo/i,
        /rm\s+-rf/i,
        /exec/i,
        /eval/i,
        /system\(/i,
        /shell/i,
        /command/i,
        /\.sh/i,
        /\.py/i,
        /npm/i,
        /node/i,
        /docker/i,
        /kubectl/i
      ];

      if (forbiddenPatterns.some(p => p.test(str))) {
        logError('System ops handler detected forbidden content in remediation', new Error('Security violation'));
        return 'REMEDIATION: [security check triggered - escalation required]';
      }

      return String(r);
    });

    return {
      status: parsed.status || 'healthy',
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      remediations: sanitizedRemediations,
      escalation_required: parsed.escalation_required === true
    };
  } catch (error: any) {
    logError('System ops analysis failed', error);
    return {
      status: 'warning',
      issues: ['Analysis failed'],
      remediations: [],
      escalation_required: true
    };
  }
}

