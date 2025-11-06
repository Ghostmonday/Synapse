/**
 * Executor service executes approved actions, such as scaling resources or restarting services
 */

import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

export class Executor {
  async execute(action: string): Promise<string> {
    // Example: Execute shell commands for repairs (e.g., docker restart)
    try {
      // If action is a script path, execute it
      if (action.startsWith('/') || action.startsWith('./')) {
        const { stdout, stderr } = await execPromise(`bash ${action}`);
        return `Executed: ${stdout || stderr}`;
      } else {
        // Direct command execution
        const { stdout, stderr } = await execPromise(action);
        return `Executed: ${stdout || stderr}`;
      }
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }
}

