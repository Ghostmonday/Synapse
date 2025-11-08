/**
 * Telemetry Collector service collects metrics from Prometheus and formats them for reasoning
 * 
 * This service queries Prometheus (metrics database) for system health metrics
 * and formats them into a structure that the LLM can reason about.
 * 
 * Metrics collected:
 * - CPU usage: Average CPU utilization over 5 minutes
 * - Memory usage: Total memory consumed by containers
 * - Latency: 95th percentile HTTP request latency
 */

import fetch from 'node-fetch';

/**
 * Formatted telemetry data structure for LLM reasoning
 * All values are normalized numbers (0-1 for percentages, seconds for latency)
 */
export interface TelemetryData {
  cpuUsage: number; // CPU usage ratio (0.0 to 1.0, where 1.0 = 100%)
  memoryUsage: number; // Memory usage in bytes (or ratio if normalized)
  latency: number; // Request latency in seconds (p95)
}

export class TelemetryCollector {
  // Prometheus server URL (e.g., "http://prometheus:9090")
  private promUrl: string;

  constructor(promUrl: string) {
    this.promUrl = promUrl;
  }

  /**
   * Collect current system telemetry from Prometheus
   * 
   * Queries Prometheus API for three key metrics:
   * 1. CPU usage: Average rate over 5-minute window
   * 2. Memory usage: Sum of all container memory
   * 3. Latency: 95th percentile of HTTP request duration
   * 
   * Returns safe defaults (0) if Prometheus is unavailable.
   * This allows autonomy to continue even if metrics are temporarily unavailable.
   */
  async collect(): Promise<TelemetryData> {
    try {
      // Query Prometheus for CPU usage
      // PromQL: avg(rate(container_cpu_usage_seconds_total[5m]))
      // - container_cpu_usage_seconds_total: Cumulative CPU time
      // - rate(...[5m]): Rate of change over 5 minutes
      // - avg(): Average across all containers
      const cpuRes = await fetch(`${this.promUrl}/api/v1/query?query=avg(rate(container_cpu_usage_seconds_total[5m]))`);
      const cpuData = await cpuRes.json();
      // Extract value from Prometheus response format: {data: {result: [{value: [timestamp, value]}]}}
      // Default to '0' if query fails or returns no data
      const cpuUsage = parseFloat(cpuData?.data?.result?.[0]?.value?.[1] || '0');

      // Query Prometheus for memory usage
      // PromQL: sum(container_memory_usage_bytes)
      // - container_memory_usage_bytes: Current memory usage per container
      // - sum(): Total memory across all containers
      const memRes = await fetch(`${this.promUrl}/api/v1/query?query=sum(container_memory_usage_bytes)`);
      const memData = await memRes.json();
      const memoryUsage = parseFloat(memData?.data?.result?.[0]?.value?.[1] || '0');

      // Query Prometheus for latency (p95)
      // PromQL: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])))
      // - http_request_duration_seconds_bucket: Histogram buckets of request durations
      // - rate(...[5m]): Rate of requests in each bucket over 5 minutes
      // - sum(): Aggregate across all instances
      // - histogram_quantile(0.95): Calculate 95th percentile
      const latRes = await fetch(`${this.promUrl}/api/v1/query?query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])))`);
      const latData = await latRes.json();
      const latency = parseFloat(latData?.data?.result?.[0]?.value?.[1] || '0');

      return { cpuUsage, memoryUsage, latency };
    } catch (error) {
      // Log error but return safe defaults
      // Prevents autonomy from crashing if Prometheus is down
      // Autonomy can still work with Supabase telemetry table
      console.error('Telemetry collection error:', error);
      // Return zeros - LLM will see "no metrics available" and won't suggest actions
      return { cpuUsage: 0, memoryUsage: 0, latency: 0 };
    }
  }
}

