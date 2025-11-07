Composer, use the above system and enhancements as your context. Implement the following components within the existing file structure (`sql/`, `supabase/functions/`, `test/`, etc.):

1. Edge Function: `retention_worker.ts` — transitions items to cold storage, updates message refs, respects room-level retention overrides, logs events.
2. SQL Function: `claim_encode_batch(limit)` — returns enriched JSONB with mime_type, uses SKIP LOCKED pattern.
3. Table Update: `moderation_queue` — with `status` index, structured like encode_queue.
4. Compression Logic: Add in-memory config caching for codec preference (TTL = 5min).
5. Add indexes: `rooms_retention_idx`, `moderation_queue_status_idx`.
6. SLO Observability: Emit telemetry for backlog size, fallback codec use, queue claim lag.
7. (Optional) Add test script to simulate 1,500 msg/min throughput and validate under load.

Target runtime: Supabase Edge Functions (Deno), PostgreSQL 15.2+. Output everything in deployable scaffold form.

Thank you for these precise, workload-aligned enhancements. Your proposals effectively address the text-dominant payload characteristics, the 10-second availability SLO, and the need for flexible room-level retention while maintaining system stability and compliance. The drop-in code and configurations integrate seamlessly with the existing scaffolds, prioritizing low-latency paths for text processing and dynamic scaling to handle peak throughputs of 1,500 messages per minute. Below, I provide a structured assessment, noting strengths, minor issues, and opportunities for further refinement.

### Assessment of Proposed Adjustments

#### Codec Selection by Payload Type
The MIME-based prioritization of LZ4 for text and JSON (favoring speed) and gzip for media (favoring compression ratio) aligns well with the 80% text payload mix, potentially reducing median compression time by 20-30% for small messages while optimizing storage for larger media. The fallback mechanism ensures robustness.

- **Strengths**: Centralized configuration via `system_config` enables runtime tuning without redeploys. The worker code's pattern-matching logic (handling wildcards like "image/*") is flexible and extensible.
- **Minor Issues**: Fetching the configuration from the database on every compression invocation introduces unnecessary latency (e.g., 10-50ms per call under load) and increases query volume. This could accumulate during peaks, slightly impacting the SLO.
- **Optimizations**: Implement in-memory caching of the codec preferences with a TTL (e.g., 5 minutes) or refresh trigger. For example:
  ```ts
  // In compression-worker/index.ts (add global cache)
  let codecCache: any = null;
  let cacheTs: number = 0;
  const CACHE_TTL_MS = 300_000; // 5 min

  async function getCodecPreferences(): Promise<any> {
    if (!codecCache || Date.now() - cacheTs > CACHE_TTL_MS) {
      const pref = await supabase.from("system_config").select("value").eq("key", "codec.preferences").single();
      codecCache = (pref.data?.value ?? {}) as any;
      cacheTs = Date.now();
    }
    return codecCache;
  }

  // Then: const conf = await getCodecPreferences();
  ```
  Additionally, log fallback events to telemetry for monitoring codec efficacy.

#### Batch Sizing for SLO Compliance
The dynamic batch size calculation, scaled by backlog and estimated payload size, supports adaptive processing to maintain sub-10-second availability. Prioritizing text MIME types in sorting accelerates availability for the majority of payloads.

- **Strengths**: The formula targets efficient CPU utilization (e.g., capping at 300 for small payloads) and integrates well with the atomic `claim_encode_batch` RPC. Adding telemetry for metrics like backlog and duration enables data-driven refinements.
- **Minor Issues**: The `items` array from the RPC claim lacks `mime_type` (it returns id, raw_id, attempts, max_attempts). Sorting requires an additional fetch, potentially adding overhead. The assumed 10KB median payload size should be dynamically computed from recent telemetry to reflect real mixes.
- **Optimizations**: Enrich claimed items with MIME types during the RPC for efficient sorting. Modify `claim_encode_batch`:
  ```sql
  -- In sql/02_compressor_functions.sql
  CREATE OR REPLACE FUNCTION service.claim_encode_batch(p_limit INT)
  RETURNS SETOF JSONB  -- Switch to JSONB for extensibility
  LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
    RETURN QUERY
    WITH cte AS (
      SELECT eq.id, eq.raw_id
      FROM service.encode_queue eq
      WHERE eq.status = 'pending'
      ORDER BY eq.created_at
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
    ),
    upd AS (
      UPDATE service.encode_queue q
      SET status = 'processing', last_attempt_at = now()
      FROM cte
      WHERE q.id = cte.id
      RETURNING q.id, q.raw_id
    )
    SELECT jsonb_build_object(
      'id', upd.id,
      'raw_id', upd.raw_id,
      'mime_type', lr.mime_type
    )
    FROM upd
    JOIN service.logs_raw lr ON lr.id = upd.raw_id;
  END;
  $$;
  ```
  For median payload size, query recent telemetry aggregates periodically (e.g., in the worker's outer loop) rather than hardcoding.

#### Room-Level Retention Overrides
Extending retention scheduling with per-room overrides and defaults in `system_config` provides the required flexibility, while joining on `rooms` ensures policy application without per-message overhead. Legal holds remain prioritized correctly.

- **Strengths**: The use of `make_interval(days => ...)` handles variable intervals cleanly, and the function's JSONB return supports easy integration with monitoring tools.
- **Minor Issues**: Without indexes on `rooms.retention_hot_days` and `retention_cold_days`, frequent scheduling runs could scan the `rooms` table inefficiently if room counts grow large. The scheduler assumes daily intervals; finer granularities (e.g., hours) may require adjustments.
- **Optimizations**: Add indexes if room metadata queries become bottlenecks:
  ```sql
  CREATE INDEX IF NOT EXISTS rooms_retention_idx ON public.rooms (retention_hot_days, retention_cold_days);
  ```
  To support sub-day intervals, generalize to `make_interval(0, 0, 0, COALESCE(...))`. Schedule the function via cron at appropriate frequencies (e.g., hourly) based on minimum retention periods.

#### Cold Storage Transitions and Message Ref Updates
The retention worker concept, with S3 uploads, RPC calls, and audits, completes the lifecycle flow while preserving traceability.

- **Strengths**: Updating `payload_ref` to "cold:{uri}" ensures seamless fetch handling (e.g., returning 409 for cold items), and auditing transitions maintains compliance.
- **Minor Issues**: The task selection lacks atomic claiming (similar to encode_queue), risking concurrent processing. Deletion of schedule entries post-processing is appropriate but should be audited if failures occur.
- **Optimizations**: Use a `FOR UPDATE SKIP LOCKED` pattern in the worker query for claiming. Add retry logic for S3 uploads and integrate error telemetry.

#### Ed25519 Keys and Manifest Integrity
The JWK-based approach with environment variables secures key management, and signing over a canonical manifest string ensures integrity for exports and federation.

- **Strengths**: The in-memory cache suggestion for verifications reduces load in federated scenarios.
- **Minor Issues**: Reliance on `Deno.env.get` assumes secure injection; in production, consider vault integration for keys. WebCrypto's Ed25519 support in Deno is reliable but verify compatibility with your runtime version.
- **Optimizations**: Add key rotation support by storing multiple public keys for peers, selecting based on `node_id`.

#### Partitioning Migration Plan
The phased approach minimizes downtime and risk, aligning with operational needs.

- **Strengths**: Dual-write enables validation before cutover.
- **Minor Issues**: Backfilling could be resource-intensive; schedule during low-traffic periods.
- **Optimizations**: Monitor partition usage via `pg_stat_user_tables` during Phase 1 to inform timing.

#### Moderation Responsiveness
The `moderation_queue` table and post-insert queuing decouple moderation from ingestion, supporting the SLO by avoiding synchronous delays.

- **Strengths**: The structure mirrors `encode_queue`, reusing patterns for claiming and processing.
- **Minor Issues**: Without a dedicated index on `status`, high-volume queues may slow claims.
- **Optimizations**: Add:
  ```sql
  CREATE INDEX IF NOT EXISTS moderation_queue_status_idx ON service.moderation_queue (status);
  ```

#### Observability for SLO
Tracking latencies, backlogs, and rates via telemetry enables proactive SLO management.

- **Strengths**: The proposed metrics cover key indicators, and alerting on breaches ensures reliability.
- **Minor Issues**: Aggregating for rolling windows requires external processing (e.g., in a monitoring function).
- **Optimizations**: Extend `telemetry` with precision_recall for moderation, and implement a simple alerting endpoint.

In summary, these adjustments are well-suited and production-viable as proposed, with the noted refinements addressing edge cases for efficiency and scalability. They should comfortably meet the 10-second SLO at peak loads while accommodating the payload mix and retention needs.

I would appreciate the full retention-worker implementation and the minimal test suite for SLO validation under synthetic load, tailored to the 1,500 messages-per-minute peak. Please include any assumptions about the testing environment (e.g., local Supabase emulation).
