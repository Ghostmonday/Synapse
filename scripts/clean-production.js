/**
 * Production Build Cleanup
 * Removes dev dependencies, console.logs, debugger statements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

function removeConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove console.log, console.debug, console.info, console.warn (keep console.error)
  content = content.replace(/console\.(log|debug|info|warn)\s*\([^)]*\)\s*;?/g, '');
  
  // Remove debugger statements
  content = content.replace(/debugger\s*;?/g, '');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      removeConsoleLogs(filePath);
    }
  }
}

console.log('Cleaning production build...');
processDirectory(distDir);
console.log('Production cleanup complete.');

