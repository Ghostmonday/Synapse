/**
 * UI Component State Enums
 * 
 * Canonical state definitions for all interactive UI components.
 * These are single-source-of-truth enums used across the codebase.
 * 
 * @module ui-states
 */

/**
 * Button component states
 * 
 * @enum {string}
 * @property {string} IDLE - Default resting state
 * @property {string} HOVER - Mouse/pointer hovering over button
 * @property {string} PRESSED - Button is being pressed/clicked
 * @property {string} LOADING - Button is processing an action (show spinner)
 * @property {string} ERROR - Button action resulted in error
 * @property {string} DISABLED - Button is disabled and non-interactive
 */
export enum ButtonState {
  IDLE = 'idle',
  HOVER = 'hover',
  PRESSED = 'pressed',
  LOADING = 'loading',
  ERROR = 'error',
  DISABLED = 'disabled',
}

/**
 * Input component states
 * 
 * @enum {string}
 * @property {string} IDLE - Default empty state
 * @property {string} FOCUS - Input has focus
 * @property {string} FILLED - Input has valid value
 * @property {string} ERROR - Input has validation error
 * @property {string} DISABLED - Input is disabled
 * @property {string} LOADING - Input is validating/processing
 */
export enum InputState {
  IDLE = 'idle',
  FOCUS = 'focus',
  FILLED = 'filled',
  ERROR = 'error',
  DISABLED = 'disabled',
  LOADING = 'loading',
}

/**
 * Label component states
 * 
 * @enum {string}
 * @property {string} IDLE - Default label state
 * @property {string} REQUIRED - Required field indicator
 * @property {string} ERROR - Error state (associated input has error)
 * @property {string} DISABLED - Disabled state (associated input is disabled)
 * @property {string} LOADING - Loading state (associated input is processing)
 */
export enum LabelState {
  IDLE = 'idle',
  REQUIRED = 'required',
  ERROR = 'error',
  DISABLED = 'disabled',
  LOADING = 'loading',
}

/**
 * Form component states
 * 
 * @enum {string}
 * @property {string} IDLE - Default form state
 * @property {string} SUBMITTING - Form is being submitted
 * @property {string} SUCCESS - Form submission succeeded
 * @property {string} ERROR - Form submission failed
 */
export enum FormState {
  IDLE = 'idle',
  SUBMITTING = 'submitting',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Type guard: Check if value is a valid ButtonState
 */
export function isButtonState(value: unknown): value is ButtonState {
  return Object.values(ButtonState).includes(value as ButtonState);
}

/**
 * Type guard: Check if value is a valid InputState
 */
export function isInputState(value: unknown): value is InputState {
  return Object.values(InputState).includes(value as InputState);
}

/**
 * Type guard: Check if value is a valid LabelState
 */
export function isLabelState(value: unknown): value is LabelState {
  return Object.values(LabelState).includes(value as LabelState);
}

/**
 * Type guard: Check if value is a valid FormState
 */
export function isFormState(value: unknown): value is FormState {
  return Object.values(FormState).includes(value as FormState);
}

/**
 * Get all possible states for a component type
 */
export const COMPONENT_STATES = {
  button: Object.values(ButtonState),
  input: Object.values(InputState),
  label: Object.values(LabelState),
  form: Object.values(FormState),
} as const;

/**
 * Total number of states across all components
 */
export const TOTAL_STATES = 
  COMPONENT_STATES.button.length +
  COMPONENT_STATES.input.length +
  COMPONENT_STATES.label.length +
  COMPONENT_STATES.form.length;

