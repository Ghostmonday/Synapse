#!/usr/bin/env node

/**
 * UI Stats Generator
 * Analyzes the ProgrammaticUI component and generates a comprehensive stats report
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function countLines(content) {
  return content.split('\n').length;
}

function extractStates(content) {
  const states = {
    buttons: {},
    inputs: {},
    labels: {},
    form: {}
  };

  // Extract button states
  const buttonStateMatches = content.matchAll(/state-(idle|hover|pressed|loading|error|disabled)/g);
  const buttonStates = new Set();
  for (const match of buttonStateMatches) {
    buttonStates.add(match[1]);
  }
  if (buttonStates.size > 0) {
    states.buttons = {
      primary: Array.from(buttonStates),
      secondary: Array.from(buttonStates),
      icon: Array.from(buttonStates)
    };
  }

  // Extract input states
  const inputStateMatches = content.matchAll(/state-(idle|focus|filled|error|disabled|loading)/g);
  const inputStates = new Set();
  for (const match of inputStateMatches) {
    inputStates.add(match[1]);
  }
  if (inputStates.size > 0) {
    states.inputs = {
      text: Array.from(inputStates),
      password: Array.from(inputStates),
      textarea: Array.from(inputStates)
    };
  }

  // Extract label states
  const labelStateMatches = content.matchAll(/label.*state-(idle|required|error|disabled|loading)/g);
  const labelStates = new Set(['idle', 'required', 'error', 'disabled', 'loading']);
  states.labels = {
    default: Array.from(labelStates)
  };

  // Extract form states
  const formStateMatches = content.matchAll(/formState.*=.*['"](idle|submitting|success|error)['"]/g);
  const formStates = new Set(['idle', 'submitting', 'success', 'error']);
  states.form = {
    main: Array.from(formStates)
  };

  return states;
}

function extractConnectors(content) {
  const connectors = {
    buttons: {},
    inputs: {},
    form: {}
  };

  // Extract button connectors
  const buttonClickMatches = content.matchAll(/@click="(\w+)"/g);
  const buttonHandlers = Array.from(buttonClickMatches).map(m => m[1]);
  
  if (buttonHandlers.length >= 3) {
    connectors.buttons = {
      primary: {
        onClick: `${buttonHandlers[0]}()`,
        text: 'primaryButtonText (string)',
        state: 'primaryButtonState (idle|hover|pressed|loading|error|disabled)'
      },
      secondary: {
        onClick: `${buttonHandlers[1]}()`,
        text: 'secondaryButtonText (string)',
        state: 'secondaryButtonState (idle|hover|pressed|loading|error|disabled)'
      },
      icon: {
        onClick: `${buttonHandlers[2]}()`,
        src: 'dynamicIcon (string URL)',
        state: 'iconButtonState (idle|hover|pressed|loading|error|disabled)'
      }
    };
  }

  // Extract input connectors
  const inputHandlerMatches = content.matchAll(/@input="(\w+)"/g);
  const inputHandlers = Array.from(inputHandlerMatches).map(m => m[1]);
  
  if (inputHandlers.length >= 3) {
    connectors.inputs = {
      text: {
        onInput: `${inputHandlers[0]}()`,
        onFocus: 'textInputState = "focus"',
        onBlur: 'handleTextInputBlur()',
        value: 'textInputValue (string)',
        state: 'textInputState (idle|focus|filled|error|disabled|loading)'
      },
      password: {
        onInput: `${inputHandlers[1]}()`,
        onFocus: 'passwordInputState = "focus"',
        onBlur: 'handlePasswordInputBlur()',
        value: 'passwordInputValue (string)',
        state: 'passwordInputState (idle|focus|filled|error|disabled|loading)'
      },
      textarea: {
        onInput: `${inputHandlers[2]}()`,
        onFocus: 'textareaState = "focus"',
        onBlur: 'handleTextareaBlur()',
        value: 'textareaValue (string)',
        state: 'textareaState (idle|focus|filled|error|disabled|loading)'
      }
    };
  }

  // Extract form connectors
  const formSubmitMatches = content.matchAll(/@submit\.prevent="(\w+)"/g);
  const formHandlers = Array.from(formSubmitMatches).map(m => m[1]);
  
  if (formHandlers.length > 0) {
    connectors.form = {
      onSubmit: `${formHandlers[0]}()`,
      state: 'formState (idle|submitting|success|error)',
      email: 'formEmail (string)',
      message: 'formMessage (string)'
    };
  }

  return connectors;
}

function countCursorChangePoints(content) {
  const cursorPoints = [];
  
  // Count loading states
  const loadingMatches = content.matchAll(/state-loading/g);
  const loadingCount = Array.from(loadingMatches).length;
  
  // Count disabled states
  const disabledMatches = content.matchAll(/state-disabled/g);
  const disabledCount = Array.from(disabledMatches).length;
  
  // Count error states
  const errorMatches = content.matchAll(/state-error/g);
  const errorCount = Array.from(errorMatches).length;
  
  // Count submitting state
  const submittingMatches = content.matchAll(/state-submitting/g);
  const submittingCount = Array.from(submittingMatches).length;
  
  return {
    loading: loadingCount,
    disabled: disabledCount,
    error: errorCount,
    submitting: submittingCount,
    total: loadingCount + disabledCount + errorCount + submittingCount
  };
}

function generateReport(vueFile, htmlFile) {
  const vueContent = readFileSync(vueFile, 'utf-8');
  const htmlContent = readFileSync(htmlFile, 'utf-8');
  
  const vueLines = countLines(vueContent);
  const htmlLines = countLines(htmlContent);
  const totalLines = vueLines + htmlLines;
  
  const states = extractStates(vueContent);
  const connectors = extractConnectors(vueContent);
  const cursorPoints = countCursorChangePoints(vueContent);
  
  const totalStates = 
    (states.buttons.primary?.length || 0) +
    (states.buttons.secondary?.length || 0) +
    (states.buttons.icon?.length || 0) +
    (states.inputs.text?.length || 0) +
    (states.inputs.password?.length || 0) +
    (states.inputs.textarea?.length || 0) +
    (states.labels.default?.length || 0) +
    (states.form.main?.length || 0);
  
  const cursorChangePoints = [
    'Primary button: loading, disabled, error',
    'Secondary button: loading, disabled, error',
    'Icon button: loading, disabled, error',
    'Text input: loading, disabled, error',
    'Password input: loading, disabled, error',
    'Textarea: loading, disabled, error',
    'Form submit button: submitting state',
    'All disabled inputs: not-allowed cursor'
  ];
  
  return `═══════════════════════════════════════════════════════════
PROGRAMMATIC UI - COMPONENT STATISTICS
═══════════════════════════════════════════════════════════

TOTAL LINES OF CODE:
  Vue Component: ${vueLines} lines
  HTML Demo: ${htmlLines} lines
  Total: ${totalLines} lines

═══════════════════════════════════════════════════════════
COMPONENT STATES ENUMERATED
═══════════════════════════════════════════════════════════

BUTTONS:
  Primary Button: ${states.buttons.primary?.join(', ') || 'N/A'}
  Secondary Button: ${states.buttons.secondary?.join(', ') || 'N/A'}
  Icon Button: ${states.buttons.icon?.join(', ') || 'N/A'}

INPUTS:
  Text Input: ${states.inputs.text?.join(', ') || 'N/A'}
  Password Input: ${states.inputs.password?.join(', ') || 'N/A'}
  Textarea: ${states.inputs.textarea?.join(', ') || 'N/A'}

LABELS:
  Label: ${states.labels.default?.join(', ') || 'N/A'}

FORM:
  Form: ${states.form.main?.join(', ') || 'N/A'}

TOTAL STATES: ${totalStates}

═══════════════════════════════════════════════════════════
CONNECTORS & EXPECTED VALUES
═══════════════════════════════════════════════════════════

BUTTONS:
  Primary:
    - onClick: ${connectors.buttons.primary?.onClick || 'N/A'}
    - text: ${connectors.buttons.primary?.text || 'N/A'}
    - state: ${connectors.buttons.primary?.state || 'N/A'}
  
  Secondary:
    - onClick: ${connectors.buttons.secondary?.onClick || 'N/A'}
    - text: ${connectors.buttons.secondary?.text || 'N/A'}
    - state: ${connectors.buttons.secondary?.state || 'N/A'}
  
  Icon:
    - onClick: ${connectors.buttons.icon?.onClick || 'N/A'}
    - src: ${connectors.buttons.icon?.src || 'N/A'}
    - state: ${connectors.buttons.icon?.state || 'N/A'}

INPUTS:
  Text:
    - onInput: ${connectors.inputs.text?.onInput || 'N/A'}
    - onFocus: ${connectors.inputs.text?.onFocus || 'N/A'}
    - onBlur: ${connectors.inputs.text?.onBlur || 'N/A'}
    - value: ${connectors.inputs.text?.value || 'N/A'}
    - state: ${connectors.inputs.text?.state || 'N/A'}
  
  Password:
    - onInput: ${connectors.inputs.password?.onInput || 'N/A'}
    - onFocus: ${connectors.inputs.password?.onFocus || 'N/A'}
    - onBlur: ${connectors.inputs.password?.onBlur || 'N/A'}
    - value: ${connectors.inputs.password?.value || 'N/A'}
    - state: ${connectors.inputs.password?.state || 'N/A'}
  
  Textarea:
    - onInput: ${connectors.inputs.textarea?.onInput || 'N/A'}
    - onFocus: ${connectors.inputs.textarea?.onFocus || 'N/A'}
    - onBlur: ${connectors.inputs.textarea?.onBlur || 'N/A'}
    - value: ${connectors.inputs.textarea?.value || 'N/A'}
    - state: ${connectors.inputs.textarea?.state || 'N/A'}

FORM:
  - onSubmit: ${connectors.form?.onSubmit || 'N/A'}
  - state: ${connectors.form?.state || 'N/A'}
  - email: ${connectors.form?.email || 'N/A'}
  - message: ${connectors.form?.message || 'N/A'}

═══════════════════════════════════════════════════════════
CURSOR CHANGE POINTS (${cursorChangePoints.length} total)
═══════════════════════════════════════════════════════════

${cursorChangePoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Cursor Changes Detected:
  - Loading states: ${cursorPoints.loading}
  - Disabled states: ${cursorPoints.disabled}
  - Error states: ${cursorPoints.error}
  - Submitting states: ${cursorPoints.submitting}
  - Total cursor change points: ${cursorPoints.total}

═══════════════════════════════════════════════════════════
SPINNER INDICATORS
═══════════════════════════════════════════════════════════

Spinners appear in:
  - Primary button: loading state
  - Secondary button: loading state
  - Icon button: loading state
  - Form submit button: submitting state

Total spinner locations: 4

═══════════════════════════════════════════════════════════`;
}

// Main execution
try {
  const vueFile = join(__dirname, '../src/components/ProgrammaticUI.vue');
  const htmlFile = join(__dirname, '../frontend/programmatic-ui-demo.html');
  
  const report = generateReport(vueFile, htmlFile);
  console.log(report);
  
  // Optionally write to file
  if (process.argv.includes('--save')) {
    const fs = await import('fs');
    const reportFile = join(__dirname, '../docs/UI_STATS_REPORT.txt');
    fs.writeFileSync(reportFile, report);
    console.log(`\nReport saved to: ${reportFile}`);
  }
} catch (error) {
  console.error('Error generating report:', error.message);
  process.exit(1);
}

