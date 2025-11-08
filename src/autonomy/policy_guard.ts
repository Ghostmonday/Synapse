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
   * Current validation rules:
   * - BLOCK: Commands containing dangerous patterns (rm -rf, shutdown, format)
   * - ALLOW: Docker commands, bash scripts, script paths
   * - DEFAULT: Allow (but should be more restrictive in production)
   * 
   * TODO: Enhance with:
   * - Whitelist of allowed commands/scripts
   * - Blacklist of dangerous patterns (more comprehensive)
   * - Policy-based validation (check against policies array)
   * - Rate limiting (prevent same action from running too frequently)
   * - Resource limits (prevent actions that could exhaust resources)
   */
  validate(action: string): boolean {
    // Block obviously dangerous commands
    // These patterns are red flags that should never be executed autonomously
    if (action.includes('rm -rf') || // Delete everything recursively
        action.includes('shutdown') || // System shutdown
        action.includes('format')) { // Disk formatting
      return false; // Reject dangerous actions
    }
    
    // Allow safe operation types
    // Docker commands are generally safe (restart, scale, etc.)
    // Scripts in scripts/ directory are reviewed and version-controlled
    if (action.includes('docker') || // Docker commands
        action.includes('bash') || // Bash script execution
        action.includes('scripts/')) { // Scripts from our repo
      return true; // Allow safe operations
    }
    
    // Default: Allow (should be more restrictive in production)
    // TODO: Change to false by default and require explicit whitelist
    return true;
  }
}

