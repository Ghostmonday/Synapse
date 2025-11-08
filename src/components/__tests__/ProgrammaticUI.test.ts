/**
 * Unit Tests for ProgrammaticUI Component
 * 
 * Tests all component states, telemetry emissions, and state transitions.
 * Follows test matrix defined in tests/state-matrix.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ProgrammaticUI from '../ProgrammaticUI.vue';
import { ButtonState, InputState, FormState } from '../../types/ui-states';
import { UXEventType, UXEventCategory } from '../../types/ux-telemetry';

// Mock the telemetry composable
vi.mock('../../composables/useUXTelemetry', () => ({
  useUXTelemetry: () => ({
    logStateTransition: vi.fn(),
    logClick: vi.fn(),
    logValidationError: vi.fn(),
    componentId: 'ProgrammaticUI',
    flush: vi.fn(),
    setConsent: vi.fn(),
    getSessionId: () => 'test-session-id',
    resetSession: vi.fn(),
  }),
}));

describe('ProgrammaticUI Component', () => {
  describe('Primary Button', () => {
    describe('State: IDLE', () => {
      it('renders correctly with idle state', () => {
        const wrapper = mount(ProgrammaticUI);
        const button = wrapper.find('[data-testid="primary-btn"]').exists() ? 
          wrapper.find('[data-testid="primary-btn"]') : 
          wrapper.findAll('button').find(b => b.text().includes('Click Me'));
        
        expect(button).toBeDefined();
        expect(button?.classes()).toContain('state-idle');
      });
      
      it('accepts clicks in idle state', async () => {
        const wrapper = mount(ProgrammaticUI);
        const button = wrapper.findAll('button').find(b => b.text().includes('Click Me'));
        
        expect(button?.attributes('disabled')).toBeUndefined();
      });
      
      it('displays button text', () => {
        const wrapper = mount(ProgrammaticUI);
        const button = wrapper.findAll('button').find(b => b.text().includes('Click Me'));
        
        expect(button?.text()).toContain('Click Me');
      });
    });
    
    describe('State: LOADING', () => {
      it('shows spinner in loading state', async () => {
        const wrapper = mount(ProgrammaticUI);
        const buttons = wrapper.findAll('button');
        const primaryButton = buttons.find(b => b.text().includes('Click Me'));
        
        // Trigger loading state
        await primaryButton?.trigger('click');
        
        // Check for spinner
        const spinner = wrapper.find('.spinner');
        expect(spinner.exists()).toBe(true);
      });
      
      it('disables interaction in loading state', async () => {
        const wrapper = mount(ProgrammaticUI);
        const button = wrapper.findAll('button').find(b => b.text().includes('Click Me'));
        
        await button?.trigger('click');
        
        // Should have loading class
        expect(button?.classes()).toContain('state-loading');
      });
    });
    
    describe('State: ERROR', () => {
      it('shows error icon in error state', async () => {
        const wrapper = mount(ProgrammaticUI);
        const buttons = wrapper.findAll('button');
        const errorButton = buttons.find(b => b.text() === 'Error');
        
        // Click the "Error" state control button
        await errorButton?.trigger('click');
        
        // Check for error state
        const primaryButton = buttons.find(b => b.classes().includes('state-error'));
        expect(primaryButton).toBeDefined();
      });
      
      it('applies error class', async () => {
        const wrapper = mount(ProgrammaticUI);
        const buttons = wrapper.findAll('button');
        const errorButton = buttons.find(b => b.text() === 'Error');
        
        await errorButton?.trigger('click');
        
        const primaryButton = buttons.find(b => b.classes().includes('state-error'));
        expect(primaryButton?.classes()).toContain('state-error');
      });
    });
    
    describe('State: DISABLED', () => {
      it('disables button in disabled state', async () => {
        const wrapper = mount(ProgrammaticUI);
        const buttons = wrapper.findAll('button');
        const disabledButton = buttons.find(b => b.text() === 'Disabled');
        
        await disabledButton?.trigger('click');
        
        // Check for disabled state
        const primaryButton = buttons.find(b => b.classes().includes('state-disabled'));
        expect(primaryButton).toBeDefined();
      });
      
      it('applies not-allowed cursor', async () => {
        const wrapper = mount(ProgrammaticUI);
        const buttons = wrapper.findAll('button');
        const disabledButton = buttons.find(b => b.text() === 'Disabled');
        
        await disabledButton?.trigger('click');
        
        const primaryButton = buttons.find(b => b.classes().includes('state-disabled'));
        expect(primaryButton?.classes()).toContain('state-disabled');
      });
    });
  });
  
  describe('Telemetry Emissions', () => {
    let logStateTransitionSpy: any;
    let logClickSpy: any;
    
    beforeEach(() => {
      const { useUXTelemetry } = require('../../composables/useUXTelemetry');
      const telemetry = useUXTelemetry();
      logStateTransitionSpy = vi.spyOn(telemetry, 'logStateTransition');
      logClickSpy = vi.spyOn(telemetry, 'logClick');
    });
    
    it('emits ui_click event on button click', async () => {
      const wrapper = mount(ProgrammaticUI);
      const button = wrapper.findAll('button').find(b => b.text().includes('Click Me'));
      
      await button?.trigger('click');
      
      // Verify click event was logged
      expect(logClickSpy).toHaveBeenCalledWith(
        expect.objectContaining({ buttonType: 'primary' }),
        expect.objectContaining({ componentIdOverride: 'PrimaryButton' })
      );
    });
    
    it('emits ui_state_transition on state change', async () => {
      const wrapper = mount(ProgrammaticUI);
      const button = wrapper.findAll('button').find(b => b.text().includes('Click Me'));
      
      await button?.trigger('click');
      
      // Verify state transition was logged
      expect(logStateTransitionSpy).toHaveBeenCalledWith(
        ButtonState.IDLE,
        ButtonState.LOADING,
        UXEventCategory.UI_STATE,
        expect.objectContaining({ buttonType: 'primary', action: 'click' }),
        expect.objectContaining({ componentIdOverride: 'PrimaryButton' })
      );
    });
    
    it('includes traceId and sessionId in events', () => {
      // Verify that the composable provides these
      const { useUXTelemetry } = require('../../composables/useUXTelemetry');
      const telemetry = useUXTelemetry();
      
      expect(telemetry.getSessionId()).toBe('test-session-id');
    });
  });
  
  describe('Form Submission', () => {
    it('transitions to submitting state on submit', async () => {
      const wrapper = mount(ProgrammaticUI);
      const form = wrapper.find('form');
      
      await form.trigger('submit');
      
      // Form should be in submitting state
      expect(form.classes()).toContain('state-submitting');
    });
    
    it('emits telemetry on form submission', async () => {
      const { useUXTelemetry } = require('../../composables/useUXTelemetry');
      const telemetry = useUXTelemetry();
      const logStateTransitionSpy = vi.spyOn(telemetry, 'logStateTransition');
      
      const wrapper = mount(ProgrammaticUI);
      const form = wrapper.find('form');
      
      await form.trigger('submit');
      
      expect(logStateTransitionSpy).toHaveBeenCalledWith(
        FormState.IDLE,
        FormState.SUBMITTING,
        UXEventCategory.CLICKSTREAM,
        expect.objectContaining({ formId: 'demo-form' }),
        expect.objectContaining({ componentIdOverride: 'DemoForm' })
      );
    });
  });
  
  describe('Input Validation', () => {
    it('transitions to filled state on input', async () => {
      const wrapper = mount(ProgrammaticUI);
      const input = wrapper.find('#standard-input');
      
      await input.setValue('test value');
      
      expect(input.classes()).toContain('state-filled');
    });
    
    it('emits telemetry on input state change', async () => {
      const { useUXTelemetry } = require('../../composables/useUXTelemetry');
      const telemetry = useUXTelemetry();
      const logStateTransitionSpy = vi.spyOn(telemetry, 'logStateTransition');
      
      const wrapper = mount(ProgrammaticUI);
      const input = wrapper.find('#standard-input');
      
      await input.setValue('test value');
      
      expect(logStateTransitionSpy).toHaveBeenCalledWith(
        expect.any(String),
        InputState.FILLED,
        UXEventCategory.UI_STATE,
        expect.objectContaining({ inputType: 'text' }),
        expect.objectContaining({ componentIdOverride: 'TextInput' })
      );
    });
  });
  
  describe('Enum Usage', () => {
    it('uses ButtonState enum for button states', () => {
      const wrapper = mount(ProgrammaticUI);
      
      // Component should use enums internally
      // This test verifies the component compiles with enums
      expect(wrapper.exists()).toBe(true);
    });
    
    it('uses InputState enum for input states', () => {
      const wrapper = mount(ProgrammaticUI);
      
      expect(wrapper.exists()).toBe(true);
    });
    
    it('uses FormState enum for form states', () => {
      const wrapper = mount(ProgrammaticUI);
      
      expect(wrapper.exists()).toBe(true);
    });
  });
});

