/**
 * Telemetry Collector service collects metrics from Prometheus and formats them for reasoning
 */

import fetch from 'node-fetch';

export interface TelemetryData {
  cpuUsage: number;
  memoryUsage: number;
  latency: number;
}

export class TelemetryCollector {
  private promUrl: string;

  constructor(promUrl: string) {
    this.promUrl = promUrl;
  }

  async collect(): Promise<TelemetryData> {
    try {
      // Query Prometheus for CPU usage
      const cpuRes = await fetch(`${this.promUrl}/api/v1/query?query=avg(rate(container_cpu_usage_seconds_total[5m]))`);
      const cpuData = await cpuRes.json();
      const cpuUsage = parseFloat(cpuData?.data?.result?.[0]?.value?.[1] || '0');

      // Query Prometheus for memory usage
      const memRes = await fetch(`${this.promUrl}/api/v1/query?query=sum(container_memory_usage_bytes)`);
      const memData = await memRes.json();
      const memoryUsage = parseFloat(memData?.data?.result?.[0]?.value?.[1] || '0');

      // Query Prometheus for latency (p95)
      const latRes = await fetch(`${this.promUrl}/api/v1/query?query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])))`);
      const latData = await latRes.json();
      const latency = parseFloat(latData?.data?.result?.[0]?.value?.[1] || '0');

      return { cpuUsage, memoryUsage, latency };
    } catch (error) {
      console.error('Telemetry collection error:', error);
      // Return default values on error
      return { cpuUsage: 0, memoryUsage: 0, latency: 0 };
    }
  }
}

