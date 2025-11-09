/**
 * LLM Parameter Manager Service
 * Centralized service to resolve, validate, and manage all LLM parameters
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  LLM_PARAMS_DEFAULT,
  LLMParameter,
  ControlType,
  ParameterCategory,
  ModelConfig,
  TemperatureConfig,
  TokenConfig,
  RateLimitConfig,
  ModerationConfig,
  PerformanceConfig,
  AutomationConfig,
  SearchConfig,
  MaintenanceConfig
} from '../config/llm-params.config';
import { PolicyGuard } from '../autonomy/policy_guard';
import { logger } from '../utils/logger';

// Events emitted when parameters change
export enum ParameterEvent {
  PARAMETER_CHANGED = 'parameter_changed',
  VALIDATION_FAILED = 'validation_failed',
  OVERRIDE_APPLIED = 'override_applied',
  AGENT_ADJUSTMENT = 'agent_adjustment'
}

export interface ParameterChange {
  parameterId: string;
  category: ParameterCategory;
  oldValue: any;
  newValue: any;
  changedBy: 'user' | 'agent' | 'manual' | 'system';
  timestamp: Date;
  reason?: string;
}

export class LLMParameterManager extends EventEmitter {
  private static instance: LLMParameterManager;
  private parameters: Map<string, LLMParameter> = new Map();
  private overrides: Map<string, any> = new Map();
  private configPath: string = path.join(process.cwd(), 'config', 'llm-params-runtime.json');
  private policyGuard: PolicyGuard;

  private constructor() {
    super();
    this.policyGuard = new PolicyGuard();
    this.initializeParameters();
    this.loadRuntimeConfig();
  }

  public static getInstance(): LLMParameterManager {
    if (!LLMParameterManager.instance) {
      LLMParameterManager.instance = new LLMParameterManager();
    }
    return LLMParameterManager.instance;
  }

  /**
   * Initialize parameters from default configuration
   */
  private initializeParameters(): void {
    // Flatten all parameters into the map
    Object.entries(LLM_PARAMS_DEFAULT).forEach(([key, param]) => {
      this.parameters.set(param.id, {
        ...param,
        currentValue: param.currentValue || param.defaultValue
      });
    });
  }

  /**
   * Load runtime configuration from disk if exists
   */
  private async loadRuntimeConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const runtimeConfig = JSON.parse(configData);
      
      Object.entries(runtimeConfig).forEach(([paramId, value]) => {
        const param = this.parameters.get(paramId);
        if (param && this.validateParameter(param, value)) {
          param.currentValue = value;
          this.overrides.set(paramId, value);
        }
      });
    } catch (error) {
      // Config file doesn't exist or is invalid, use defaults
      logger.info('No runtime config found, using defaults');
    }
  }

  /**
   * Save current runtime configuration to disk
   */
  private async saveRuntimeConfig(): Promise<void> {
    const runtimeConfig: Record<string, any> = {};
    
    this.parameters.forEach((param, id) => {
      if (param.currentValue !== param.defaultValue) {
        runtimeConfig[id] = param.currentValue;
      }
    });

    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(runtimeConfig, null, 2));
  }

  /**
   * Get a specific parameter value
   */
  public get<T>(parameterId: string): T | undefined {
    const param = this.parameters.get(parameterId);
    return param?.currentValue as T;
  }

  /**
   * Get all parameters in a category
   */
  public getByCategory(category: ParameterCategory): LLMParameter[] {
    return Array.from(this.parameters.values())
      .filter(param => param.category === category);
  }

  /**
   * Get all parameters controllable by a specific method
   */
  public getByControlType(controlType: ControlType): LLMParameter[] {
    return Array.from(this.parameters.values())
      .filter(param => param.controlType === controlType || param.controlType === ControlType.HYBRID);
  }

  /**
   * Set a parameter value with validation and authorization
   */
  public async set(
    parameterId: string, 
    value: any, 
    changedBy: 'user' | 'agent' | 'manual' | 'system',
    reason?: string
  ): Promise<boolean> {
    const param = this.parameters.get(parameterId);
    if (!param) {
      logger.error(`Parameter ${parameterId} not found`);
      return false;
    }

    // Check control type authorization
    if (!this.isAuthorized(param, changedBy)) {
      logger.warn(`Unauthorized attempt to change ${parameterId} by ${changedBy}`);
      this.emit(ParameterEvent.VALIDATION_FAILED, {
        parameterId,
        reason: 'Unauthorized control type',
        attemptedBy: changedBy
      });
      return false;
    }

    // Validate the new value
    if (!this.validateParameter(param, value)) {
      this.emit(ParameterEvent.VALIDATION_FAILED, {
        parameterId,
        reason: 'Value validation failed',
        attemptedValue: value
      });
      return false;
    }

    // For agent changes, verify with PolicyGuard
    if (changedBy === 'agent') {
      const isApproved = await this.policyGuard.validateAction({
        action: 'parameter_adjustment',
        target: parameterId,
        newValue: value,
        context: { reason, category: param.category }
      });

      if (!isApproved) {
        logger.warn(`PolicyGuard rejected parameter change for ${parameterId}`);
        return false;
      }
    }

    // Apply the change
    const oldValue = param.currentValue;
    param.currentValue = value;
    
    // Save to runtime config
    await this.saveRuntimeConfig();

    // Emit change event
    const change: ParameterChange = {
      parameterId,
      category: param.category,
      oldValue,
      newValue: value,
      changedBy,
      timestamp: new Date(),
      reason
    };

    this.emit(ParameterEvent.PARAMETER_CHANGED, change);
    
    if (changedBy === 'agent') {
      this.emit(ParameterEvent.AGENT_ADJUSTMENT, change);
    }

    logger.info(`Parameter ${parameterId} changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(value)} by ${changedBy}`);
    
    return true;
  }

  /**
   * Check if a change is authorized based on control type
   */
  private isAuthorized(param: LLMParameter, changedBy: string): boolean {
    switch (param.controlType) {
      case ControlType.UI:
        return changedBy === 'user';
      case ControlType.AGENT:
        return changedBy === 'agent' || changedBy === 'system';
      case ControlType.MANUAL:
        return changedBy === 'manual';
      case ControlType.HYBRID:
        return ['user', 'agent', 'manual'].includes(changedBy);
      default:
        return false;
    }
  }

  /**
   * Validate a parameter value
   */
  private validateParameter(param: LLMParameter, value: any): boolean {
    // Type check
    if (typeof value !== typeof param.defaultValue) {
      return false;
    }

    // Custom validator
    if (param.validator) {
      return param.validator(value);
    }

    // Range validation for numbers
    if (typeof value === 'number') {
      if (param.minValue !== undefined && value < param.minValue) return false;
      if (param.maxValue !== undefined && value > param.maxValue) return false;
    }

    // Allowed values validation
    if (param.allowedValues && !param.allowedValues.includes(value)) {
      return false;
    }

    return true;
  }

  /**
   * Apply manual override from environment or config
   */
  public applyOverride(parameterId: string, value: any): boolean {
    const param = this.parameters.get(parameterId);
    if (!param) return false;

    if (this.validateParameter(param, value)) {
      param.currentValue = value;
      this.overrides.set(parameterId, value);
      
      this.emit(ParameterEvent.OVERRIDE_APPLIED, {
        parameterId,
        value,
        timestamp: new Date()
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Get current model configuration
   */
  public getModels(): ModelConfig {
    return this.get<ModelConfig>('llm.models')!;
  }

  /**
   * Get current temperature configuration  
   */
  public getTemperature(): TemperatureConfig {
    return this.get<TemperatureConfig>('llm.temperature')!;
  }

  /**
   * Get current token configuration
   */
  public getTokenConfig(): TokenConfig {
    return this.get<TokenConfig>('llm.tokens')!;
  }

  /**
   * Get current rate limit configuration
   */
  public getRateLimits(): RateLimitConfig {
    return this.get<RateLimitConfig>('llm.rateLimits')!;
  }

  /**
   * Get current moderation configuration
   */
  public getModeration(): ModerationConfig {
    return this.get<ModerationConfig>('llm.moderation')!;
  }

  /**
   * Get current performance boundaries
   */
  public getPerformance(): PerformanceConfig {
    return this.get<PerformanceConfig>('llm.performance')!;
  }

  /**
   * Get current automation configuration
   */
  public getAutomation(): AutomationConfig {
    return this.get<AutomationConfig>('llm.automation')!;
  }

  /**
   * Get current search configuration
   */
  public getSearch(): SearchConfig {
    return this.get<SearchConfig>('llm.search')!;
  }

  /**
   * Get current maintenance window
   */
  public getMaintenance(): MaintenanceConfig {
    return this.get<MaintenanceConfig>('llm.maintenance')!;
  }

  /**
   * Export all current parameter values
   */
  public exportConfig(): Record<string, any> {
    const config: Record<string, any> = {};
    
    this.parameters.forEach((param, id) => {
      config[id] = param.currentValue;
    });
    
    return config;
  }

  /**
   * Import configuration with validation
   */
  public async importConfig(config: Record<string, any>): Promise<boolean> {
    let success = true;
    
    for (const [paramId, value] of Object.entries(config)) {
      const result = await this.set(paramId, value, 'manual', 'Configuration import');
      if (!result) success = false;
    }
    
    return success;
  }

  /**
   * Reset a parameter to default value
   */
  public async reset(parameterId: string): Promise<boolean> {
    const param = this.parameters.get(parameterId);
    if (!param) return false;
    
    return await this.set(parameterId, param.defaultValue, 'system', 'Reset to default');
  }

  /**
   * Reset all parameters to defaults
   */
  public async resetAll(): Promise<void> {
    for (const [id, param] of this.parameters) {
      await this.set(id, param.defaultValue, 'system', 'Reset all to defaults');
    }
  }

  /**
   * Get parameters that need UI controls
   */
  public getUIControlled(): LLMParameter[] {
    return this.getByControlType(ControlType.UI);
  }

  /**
   * Get parameters that agents can modify
   */
  public getAgentControlled(): LLMParameter[] {
    return this.getByControlType(ControlType.AGENT);
  }

  /**
   * Check if within maintenance window
   */
  public isInMaintenanceWindow(): boolean {
    const maintenance = this.getMaintenance();
    const now = new Date();
    const currentHour = now.getUTCHours(); // Always UTC as per config
    
    if (maintenance.windowStartHour < maintenance.windowEndHour) {
      // Normal case: e.g., 3-5 AM
      return currentHour >= maintenance.windowStartHour && currentHour < maintenance.windowEndHour;
    } else {
      // Wrapped case: e.g., 23-2 AM
      return currentHour >= maintenance.windowStartHour || currentHour < maintenance.windowEndHour;
    }
  }
}

// Singleton export
export const llmParamManager = LLMParameterManager.getInstance();
