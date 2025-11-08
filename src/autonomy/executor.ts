/**
 * Executor service executes approved actions, such as scaling resources or restarting services
 * 
 * This is the "hands" of the autonomy system - it actually runs the repair actions
 * that the LLM proposes and PolicyGuard approves.
 * 
 * SECURITY NOTE: This executes shell commands! Only actions that pass PolicyGuard
 * validation should reach this point. Never execute user-provided commands directly.
 */

import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

export class Executor {
  /**
   * Execute an approved action (shell command or script)
   * 
   * Supports two formats:
   * 1. Script paths: "/path/to/script.sh" or "./scripts/repair.sh"
   * 2. Direct commands: "docker restart service-name"
   * 
   * @param action - Shell command or script path to execute
   * @returns Execution result (stdout/stderr or error message)
   */
  async execute(action: string): Promise<string> {
    try {
      // Check if action is a file path (absolute or relative)
      // If so, execute it as a bash script
      if (action.startsWith('/') || action.startsWith('./')) {
        // Execute script with bash
        // Scripts are safer than direct commands because they can be reviewed
        // and version-controlled
        const { stdout, stderr } = await execPromise(`bash ${action}`);
        return `Executed: ${stdout || stderr}`;
      } else {
        // Direct command execution
        // Examples: "docker restart worker", "kubectl scale deployment api --replicas=3"
        // WARNING: Only execute commands that have been validated by PolicyGuard!
        const { stdout, stderr } = await execPromise(action);
        return `Executed: ${stdout || stderr}`;
      }
    } catch (error: any) {
      // Return error message instead of throwing
      // Allows caller to log and continue processing other actions
      return `Error: ${error.message}`;
    }
  }
}

