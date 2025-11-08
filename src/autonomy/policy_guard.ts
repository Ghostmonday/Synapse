/**
 * Policy Guard service validates proposed actions against predefined policies to prevent unsafe operations
 * 
 * This is the "safety net" of the autonomy system. It prevents LLM from executing
 * dangerous commands like deleting data, shutting down services, or formatting disks.
 * 
 * CRITICAL: This is the last line of defense before Executor runs commands.
 * Always err on the side of caution - reject if unsure.
 */

export class PolicyGuard {
  // Policy names for reference (not currently used in validation logic)
  // Future: Implement policy-based validation (e.g., "no-downtime-actions" policy)
  private policies: string[] = ['no-downtime-actions', 'resource-limits']; // Example policies

  /**
   * Validate an action before execution
   * 
   * Returns true if action is safe to execute, false otherwise.
   * 
   * Supports both string commands and AI automation actions (with reasoning)
   * 
   * Current validation rules:
   * - BLOCK: Commands containing dangerous patterns (rm -rf, shutdown, format)
   * - BLOCK: AI actions that modify critical data (delete user data, change security settings)
   * - ALLOW: Docker commands, bash scripts, script paths
   * - ALLOW: Safe AI automations (rate limits, cache TTL, moderation thresholds)
   * - DEFAULT: Allow (but should be more restrictive in production)
   */
  validate(action: string | { action: string; reasoning?: string; [key: string]: any }): boolean {
    // Handle both string commands and AI action objects
    const actionStr = typeof action === 'string' ? action : action.action;
    const reasoning = typeof action === 'object' ? action.reasoning : undefined;
    const actionType = typeof action === 'object' ? action.action : action;

    // Block obviously dangerous commands
    // These patterns are red flags that should never be executed autonomously
    if (actionStr.includes('rm -rf') || // Delete everything recursively
        actionStr.includes('shutdown') || // System shutdown
        actionStr.includes('format') || // Disk formatting
        actionStr.includes('drop table') || // Database table deletion
        actionStr.includes('delete from') && actionStr.includes('users')) { // User data deletion
      return false; // Reject dangerous actions
    }

    // AI Automation Actions - Whitelist of safe actions
    const safeAIActions = [
      'adjust_rate_limit',
      'deactivate_bot',
      'enable_auto_moderation',
      'adjust_cache_ttl',
      'create_index',
      'adjust_moderation_threshold',
      'optimize_query',
      'scale_resource'
    ];

    // Check if this is a whitelisted AI action
    if (typeof action === 'object' && safeAIActions.includes(actionType)) {
      // Additional validation based on action type
      switch (actionType) {
        case 'adjust_rate_limit':
          // Allow rate limit adjustments (safe)
          return true;
        case 'deactivate_bot':
          // Allow bot deactivation if reasoning is provided
          return !!reasoning;
        case 'enable_auto_moderation':
          // Allow auto-moderation enablement (safe)
          return true;
        case 'adjust_cache_ttl':
          // Allow cache TTL adjustments (safe)
          return true;
        case 'create_index':
          // Allow index creation (safe, improves performance)
          return true;
        case 'adjust_moderation_threshold':
          // Allow moderation threshold adjustments (safe)
          return true;
        default:
          // Unknown AI action - require explicit approval
          return false;
      }
    }
    
    // Block dangerous AI actions
    const dangerousAIActions = [
      'delete_user_data',
      'change_security_settings',
      'modify_rls_policies',
      'grant_admin_access',
      'change_billing_settings'
    ];

    if (typeof action === 'object' && dangerousAIActions.includes(actionType)) {
      return false; // Always reject dangerous AI actions
    }
    
    // Allow safe operation types
    // Docker commands are generally safe (restart, scale, etc.)
    // Scripts in scripts/ directory are reviewed and version-controlled
    if (actionStr.includes('docker') || // Docker commands
        actionStr.includes('bash') || // Bash script execution
        actionStr.includes('scripts/')) { // Scripts from our repo
      return true; // Allow safe operations
    }
    
    // Default: Allow (but should be more restrictive in production)
    // TODO: Change to false by default and require explicit whitelist
    return true;
  }
}

