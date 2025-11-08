/**
 * UI Component Connector Interfaces
 * 
 * Typed interfaces for component handlers and props.
 * Provides clean contract for backend/analytics stub adapters.
 * 
 * @module connectors
 */

import type { ButtonState, InputState, FormState } from './ui-states.js';

/**
 * Button Connector Interface
 * 
 * Defines the contract for button components and their handlers.
 */
export interface ButtonConnector {
  /** Click handler function */
  onClick: () => void | Promise<void>;
  
  /** Current button state */
  state: ButtonState;
  
  /** Button text content */
  text: string;
  
  /** Optional icon/image source */
  src?: string;
  
  /** Optional trace ID for backend correlation */
  traceId?: string;
  
  /** Component identifier */
  componentId: string;
}

/**
 * Input Connector Interface
 * 
 * Defines the contract for input components and their handlers.
 */
export interface InputConnector {
  /** Input change handler */
  onInput: (value: string) => void;
  
  /** Focus handler */
  onFocus: () => void;
  
  /** Blur handler */
  onBlur: () => void;
  
  /** Current input state */
  state: InputState;
  
  /** Input value */
  value: string;
  
  /** Validation error message (if state is ERROR) */
  errorMessage?: string;
  
  /** Optional trace ID for backend correlation */
  traceId?: string;
  
  /** Component identifier */
  componentId: string;
}

/**
 * Form Connector Interface
 * 
 * Defines the contract for form components and their handlers.
 */
export interface FormConnector {
  /** Form submission handler */
  onSubmit: (event: Event) => void | Promise<void>;
  
  /** Current form state */
  state: FormState;
  
  /** Form field values */
  values: Record<string, unknown>;
  
  /** Form validation errors */
  errors?: Record<string, string>;
  
  /** Optional trace ID for backend correlation */
  traceId?: string;
  
  /** Component identifier */
  componentId: string;
}

/**
 * Generic Event Connector Interface
 * 
 * For components with custom event handlers.
 */
export interface EventConnector<TState = string, TData = unknown> {
  /** Event handler */
  onEvent: (data: TData) => void | Promise<void>;
  
  /** Current component state */
  state: TState;
  
  /** Event-specific data */
  data?: TData;
  
  /** Optional trace ID for backend correlation */
  traceId?: string;
  
  /** Component identifier */
  componentId: string;
}

/**
 * Asset Connector Interface
 * 
 * For components with dynamic asset loading (images, icons, etc.)
 */
export interface AssetConnector {
  /** Asset source URL */
  src: string;
  
  /** Alternative text */
  alt?: string;
  
  /** Loading state */
  loading: boolean;
  
  /** Error state */
  error?: Error;
  
  /** Component identifier */
  componentId: string;
}

/**
 * Helper type: Extract handler types from connectors
 */
export type ConnectorHandler<T> = T extends { onClick: infer H }
  ? H
  : T extends { onInput: infer H }
  ? H
  : T extends { onSubmit: infer H }
  ? H
  : T extends { onEvent: infer H }
  ? H
  : never;

/**
 * Helper type: Extract state types from connectors
 */
export type ConnectorState<T> = T extends { state: infer S } ? S : never;

