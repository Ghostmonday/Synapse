<template>
  <div class="programmatic-ui">
    <!-- Stats Panel -->
    <div class="stats-panel">
      <h2>UI Component Statistics</h2>
      <pre>{{ statsReport }}</pre>
    </div>

    <!-- Main Screen -->
    <div class="main-screen">
      <h1>Programmatic UI - All States</h1>

      <!-- Buttons Section -->
      <section class="component-section">
        <h2>Buttons</h2>
        
        <!-- Primary Button - All States -->
        <div class="button-group">
          <h3>Primary Button</h3>
          <button
            class="btn btn-primary"
            :class="{
              'state-idle': primaryButtonState === ButtonState.IDLE,
              'state-hover': primaryButtonState === ButtonState.HOVER,
              'state-pressed': primaryButtonState === ButtonState.PRESSED,
              'state-loading': primaryButtonState === ButtonState.LOADING,
              'state-error': primaryButtonState === ButtonState.ERROR,
              'state-disabled': primaryButtonState === ButtonState.DISABLED
            }"
            @click="handlePrimaryClick"
            @mouseenter="setPrimaryState(ButtonState.HOVER)"
            @mouseleave="setPrimaryState(ButtonState.IDLE)"
            @mousedown="setPrimaryState(ButtonState.PRESSED)"
            @mouseup="setPrimaryState(ButtonState.HOVER)"
            :disabled="primaryButtonState === ButtonState.DISABLED"
          >
            <span v-if="primaryButtonState === ButtonState.LOADING" class="spinner"></span>
            <span v-else-if="primaryButtonState === ButtonState.ERROR">⚠️</span>
            <span v-else>{{ primaryButtonText }}</span>
          </button>
          <div class="state-controls">
            <button @click="setPrimaryState(ButtonState.IDLE)">Idle</button>
            <button @click="setPrimaryState(ButtonState.LOADING)">Loading</button>
            <button @click="setPrimaryState(ButtonState.ERROR)">Error</button>
            <button @click="setPrimaryState(ButtonState.DISABLED)">Disabled</button>
          </div>
        </div>

        <!-- Secondary Button -->
        <div class="button-group">
          <h3>Secondary Button</h3>
          <button
            class="btn btn-secondary"
            :class="{
              'state-idle': secondaryButtonState === ButtonState.IDLE,
              'state-hover': secondaryButtonState === ButtonState.HOVER,
              'state-pressed': secondaryButtonState === ButtonState.PRESSED,
              'state-loading': secondaryButtonState === ButtonState.LOADING,
              'state-error': secondaryButtonState === ButtonState.ERROR,
              'state-disabled': secondaryButtonState === ButtonState.DISABLED
            }"
            @click="handleSecondaryClick"
            @mouseenter="setSecondaryState(ButtonState.HOVER)"
            @mouseleave="setSecondaryState(ButtonState.IDLE)"
            @mousedown="setSecondaryState(ButtonState.PRESSED)"
            @mouseup="setSecondaryState(ButtonState.HOVER)"
            :disabled="secondaryButtonState === ButtonState.DISABLED"
          >
            <span v-if="secondaryButtonState === ButtonState.LOADING" class="spinner"></span>
            <span v-else-if="secondaryButtonState === ButtonState.ERROR">⚠️</span>
            <span v-else>{{ secondaryButtonText }}</span>
          </button>
          <div class="state-controls">
            <button @click="setSecondaryState(ButtonState.IDLE)">Idle</button>
            <button @click="setSecondaryState(ButtonState.LOADING)">Loading</button>
            <button @click="setSecondaryState(ButtonState.ERROR)">Error</button>
            <button @click="setSecondaryState(ButtonState.DISABLED)">Disabled</button>
          </div>
        </div>

        <!-- Icon Button -->
        <div class="button-group">
          <h3>Icon Button</h3>
          <button
            class="btn btn-icon"
            :class="{
              'state-idle': iconButtonState === ButtonState.IDLE,
              'state-hover': iconButtonState === ButtonState.HOVER,
              'state-pressed': iconButtonState === ButtonState.PRESSED,
              'state-loading': iconButtonState === ButtonState.LOADING,
              'state-error': iconButtonState === ButtonState.ERROR,
              'state-disabled': iconButtonState === ButtonState.DISABLED
            }"
            @click="handleIconClick"
            @mouseenter="setIconState(ButtonState.HOVER)"
            @mouseleave="setIconState(ButtonState.IDLE)"
            @mousedown="setIconState(ButtonState.PRESSED)"
            @mouseup="setIconState(ButtonState.HOVER)"
            :disabled="iconButtonState === ButtonState.DISABLED"
          >
            <img v-if="iconButtonState !== ButtonState.LOADING && iconButtonState !== ButtonState.ERROR" :src="dynamicIcon" alt="Icon" />
            <span v-if="iconButtonState === ButtonState.LOADING" class="spinner"></span>
            <span v-else-if="iconButtonState === ButtonState.ERROR">⚠️</span>
          </button>
          <div class="state-controls">
            <button @click="setIconState(ButtonState.IDLE)">Idle</button>
            <button @click="setIconState(ButtonState.LOADING)">Loading</button>
            <button @click="setIconState(ButtonState.ERROR)">Error</button>
            <button @click="setIconState(ButtonState.DISABLED)">Disabled</button>
          </div>
        </div>
      </section>

      <!-- Text Inputs Section -->
      <section class="component-section">
        <h2>Text Inputs</h2>
        
        <!-- Standard Text Input -->
        <div class="input-group">
          <h3>Standard Text Input</h3>
          <label for="standard-input">Username</label>
          <input
            id="standard-input"
            type="text"
            class="input"
            :class="{
              'state-idle': textInputState === InputState.IDLE,
              'state-focus': textInputState === InputState.FOCUS,
              'state-filled': textInputState === InputState.FILLED,
              'state-error': textInputState === InputState.ERROR,
              'state-disabled': textInputState === InputState.DISABLED,
              'state-loading': textInputState === InputState.LOADING
            }"
            v-model="textInputValue"
            @focus="setTextInputState(InputState.FOCUS)"
            @blur="handleTextInputBlur"
            @input="handleTextInput"
            :disabled="textInputState === InputState.DISABLED"
            placeholder="Enter username"
          />
          <div v-if="textInputState === InputState.ERROR" class="error-message">Invalid input</div>
          <div v-if="textInputState === InputState.LOADING" class="loading-indicator">Validating...</div>
          <div class="state-controls">
            <button @click="setTextInputState(InputState.IDLE)">Idle</button>
            <button @click="setTextInputState(InputState.ERROR)">Error</button>
            <button @click="setTextInputState(InputState.DISABLED)">Disabled</button>
            <button @click="setTextInputState(InputState.LOADING)">Loading</button>
          </div>
        </div>

        <!-- Password Input -->
        <div class="input-group">
          <h3>Password Input</h3>
          <label for="password-input">Password</label>
          <input
            id="password-input"
            type="password"
            class="input"
            :class="{
              'state-idle': passwordInputState === InputState.IDLE,
              'state-focus': passwordInputState === InputState.FOCUS,
              'state-filled': passwordInputState === InputState.FILLED,
              'state-error': passwordInputState === InputState.ERROR,
              'state-disabled': passwordInputState === InputState.DISABLED,
              'state-loading': passwordInputState === InputState.LOADING
            }"
            v-model="passwordInputValue"
            @focus="setPasswordInputState(InputState.FOCUS)"
            @blur="handlePasswordInputBlur"
            @input="handlePasswordInput"
            :disabled="passwordInputState === InputState.DISABLED"
            placeholder="Enter password"
          />
          <div v-if="passwordInputState === InputState.ERROR" class="error-message">Password too weak</div>
          <div v-if="passwordInputState === InputState.LOADING" class="loading-indicator">Checking...</div>
          <div class="state-controls">
            <button @click="setPasswordInputState(InputState.IDLE)">Idle</button>
            <button @click="setPasswordInputState(InputState.ERROR)">Error</button>
            <button @click="setPasswordInputState(InputState.DISABLED)">Disabled</button>
            <button @click="setPasswordInputState(InputState.LOADING)">Loading</button>
          </div>
        </div>

        <!-- Textarea -->
        <div class="input-group">
          <h3>Textarea</h3>
          <label for="textarea-input">Message</label>
          <textarea
            id="textarea-input"
            class="input textarea"
            :class="{
              'state-idle': textareaState === InputState.IDLE,
              'state-focus': textareaState === InputState.FOCUS,
              'state-filled': textareaState === InputState.FILLED,
              'state-error': textareaState === InputState.ERROR,
              'state-disabled': textareaState === InputState.DISABLED,
              'state-loading': textareaState === InputState.LOADING
            }"
            v-model="textareaValue"
            @focus="setTextareaState(InputState.FOCUS)"
            @blur="handleTextareaBlur"
            @input="handleTextareaInput"
            :disabled="textareaState === InputState.DISABLED"
            placeholder="Enter message"
            rows="4"
          ></textarea>
          <div v-if="textareaState === InputState.ERROR" class="error-message">Message too long</div>
          <div v-if="textareaState === InputState.LOADING" class="loading-indicator">Processing...</div>
          <div class="state-controls">
            <button @click="setTextareaState(InputState.IDLE)">Idle</button>
            <button @click="setTextareaState(InputState.ERROR)">Error</button>
            <button @click="setTextareaState(InputState.DISABLED)">Disabled</button>
            <button @click="setTextareaState(InputState.LOADING)">Loading</button>
          </div>
        </div>
      </section>

      <!-- Labels Section -->
      <section class="component-section">
        <h2>Labels</h2>
        
        <div class="label-group">
          <label class="label state-idle">Default Label</label>
          <label class="label state-required">Required Label *</label>
          <label class="label state-error">Error Label</label>
          <label class="label state-disabled">Disabled Label</label>
          <label class="label state-loading">Loading Label...</label>
        </div>
      </section>

      <!-- Form Section -->
      <section class="component-section">
        <h2>Form</h2>
        
        <form
          class="form"
          :class="{
            'state-idle': formState === FormState.IDLE,
            'state-submitting': formState === FormState.SUBMITTING,
            'state-success': formState === FormState.SUCCESS,
            'state-error': formState === FormState.ERROR
          }"
          @submit.prevent="handleSubmit"
        >
          <label for="form-email">Email</label>
          <input
            id="form-email"
            type="email"
            v-model="formEmail"
            :disabled="formState === FormState.SUBMITTING"
            placeholder="email@example.com"
          />
          
          <label for="form-message">Message</label>
          <textarea
            id="form-message"
            v-model="formMessage"
            :disabled="formState === FormState.SUBMITTING"
            placeholder="Your message"
            rows="3"
          ></textarea>
          
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="formState === FormState.SUBMITTING"
          >
            <span v-if="formState === FormState.SUBMITTING" class="spinner"></span>
            <span v-else-if="formState === FormState.SUCCESS">✓ Submitted</span>
            <span v-else-if="formState === FormState.ERROR">⚠ Retry</span>
            <span v-else>Submit</span>
          </button>
          
          <div v-if="formState === FormState.ERROR" class="form-error">
            Submission failed. Please try again.
          </div>
          <div v-if="formState === FormState.SUCCESS" class="form-success">
            Form submitted successfully!
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { ButtonState, InputState, FormState, COMPONENT_STATES } from '../types/ui-states.js';
import { UXEventCategory, UXEventType } from '../types/ux-telemetry.js';
import { useUXTelemetry } from '../composables/useUXTelemetry.js';

// Initialize UX telemetry
const { logStateTransition, logClick, logValidationError, componentId } = useUXTelemetry();

// Button States (using enums)
const primaryButtonState = ref<ButtonState>(ButtonState.IDLE);
const secondaryButtonState = ref<ButtonState>(ButtonState.IDLE);
const iconButtonState = ref<ButtonState>(ButtonState.IDLE);

// Input States (using enums)
const textInputState = ref<InputState>(InputState.IDLE);
const passwordInputState = ref<InputState>(InputState.IDLE);
const textareaState = ref<InputState>(InputState.IDLE);

// Form State (using enums)
const formState = ref<FormState>(FormState.IDLE);

// Values
const textInputValue = ref('');
const passwordInputValue = ref('');
const textareaValue = ref('');
const formEmail = ref('');
const formMessage = ref('');

// Dynamic Connectors
const dynamicIcon = ref('/assets/icon.svg'); // Placeholder - will be replaced with real asset
const primaryButtonText = ref('Click Me');
const secondaryButtonText = ref('Secondary');

// Connector Handlers (exposed for integration)
const handlePrimaryClick = () => {
  const prevState = primaryButtonState.value;
  
  // Log click event
  logClick({ buttonType: 'primary' }, { componentIdOverride: 'PrimaryButton' });
  
  console.log('Primary button clicked');
  if (primaryButtonState.value === ButtonState.IDLE) {
    primaryButtonState.value = ButtonState.LOADING;
    
    // Log state transition
    logStateTransition(
      prevState,
      ButtonState.LOADING,
      UXEventCategory.UI_STATE,
      { buttonType: 'primary', action: 'click' },
      { componentIdOverride: 'PrimaryButton' }
    );
    
    setTimeout(() => {
      const loadingState = primaryButtonState.value;
      primaryButtonState.value = ButtonState.IDLE;
      
      // Log completion
      logStateTransition(
        loadingState,
        ButtonState.IDLE,
        UXEventCategory.UI_STATE,
        { buttonType: 'primary', action: 'complete' },
        { componentIdOverride: 'PrimaryButton' }
      );
    }, 2000);
  }
};

const handleSecondaryClick = () => {
  const prevState = secondaryButtonState.value;
  
  // Log click event
  logClick({ buttonType: 'secondary' }, { componentIdOverride: 'SecondaryButton' });
  
  console.log('Secondary button clicked');
  if (secondaryButtonState.value === ButtonState.IDLE) {
    secondaryButtonState.value = ButtonState.LOADING;
    
    // Log state transition
    logStateTransition(
      prevState,
      ButtonState.LOADING,
      UXEventCategory.UI_STATE,
      { buttonType: 'secondary', action: 'click' },
      { componentIdOverride: 'SecondaryButton' }
    );
    
    setTimeout(() => {
      const loadingState = secondaryButtonState.value;
      secondaryButtonState.value = ButtonState.IDLE;
      
      // Log completion
      logStateTransition(
        loadingState,
        ButtonState.IDLE,
        UXEventCategory.UI_STATE,
        { buttonType: 'secondary', action: 'complete' },
        { componentIdOverride: 'SecondaryButton' }
      );
    }, 2000);
  }
};

const handleIconClick = () => {
  const prevState = iconButtonState.value;
  
  // Log click event
  logClick({ buttonType: 'icon' }, { componentIdOverride: 'IconButton' });
  
  console.log('Icon button clicked');
  if (iconButtonState.value === ButtonState.IDLE) {
    iconButtonState.value = ButtonState.LOADING;
    
    // Log state transition
    logStateTransition(
      prevState,
      ButtonState.LOADING,
      UXEventCategory.UI_STATE,
      { buttonType: 'icon', action: 'click' },
      { componentIdOverride: 'IconButton' }
    );
    
    setTimeout(() => {
      const loadingState = iconButtonState.value;
      iconButtonState.value = ButtonState.IDLE;
      
      // Log completion
      logStateTransition(
        loadingState,
        ButtonState.IDLE,
        UXEventCategory.UI_STATE,
        { buttonType: 'icon', action: 'complete' },
        { componentIdOverride: 'IconButton' }
      );
    }, 2000);
  }
};

const handleTextInput = () => {
  const prevState = textInputState.value;
  if (textInputValue.value.length > 0) {
    textInputState.value = InputState.FILLED;
    
    // Log state transition
    logStateTransition(
      prevState,
      InputState.FILLED,
      UXEventCategory.UI_STATE,
      { inputType: 'text', valueLength: textInputValue.value.length },
      { componentIdOverride: 'TextInput' }
    );
  }
};

const handleTextInputBlur = () => {
  const prevState = textInputState.value;
  if (textInputValue.value.length === 0) {
    textInputState.value = InputState.IDLE;
    
    logStateTransition(
      prevState,
      InputState.IDLE,
      UXEventCategory.UI_STATE,
      { inputType: 'text', action: 'blur', isEmpty: true },
      { componentIdOverride: 'TextInput' }
    );
  } else {
    textInputState.value = InputState.FILLED;
    
    logStateTransition(
      prevState,
      InputState.FILLED,
      UXEventCategory.UI_STATE,
      { inputType: 'text', action: 'blur', valueLength: textInputValue.value.length },
      { componentIdOverride: 'TextInput' }
    );
  }
};

const handlePasswordInput = () => {
  const prevState = passwordInputState.value;
  if (passwordInputValue.value.length > 0) {
    passwordInputState.value = InputState.FILLED;
    
    // Log state transition
    logStateTransition(
      prevState,
      InputState.FILLED,
      UXEventCategory.UI_STATE,
      { inputType: 'password', valueLength: passwordInputValue.value.length },
      { componentIdOverride: 'PasswordInput' }
    );
  }
};

const handlePasswordInputBlur = () => {
  const prevState = passwordInputState.value;
  if (passwordInputValue.value.length === 0) {
    passwordInputState.value = InputState.IDLE;
    
    logStateTransition(
      prevState,
      InputState.IDLE,
      UXEventCategory.UI_STATE,
      { inputType: 'password', action: 'blur', isEmpty: true },
      { componentIdOverride: 'PasswordInput' }
    );
  } else {
    passwordInputState.value = InputState.FILLED;
    
    logStateTransition(
      prevState,
      InputState.FILLED,
      UXEventCategory.UI_STATE,
      { inputType: 'password', action: 'blur', valueLength: passwordInputValue.value.length },
      { componentIdOverride: 'PasswordInput' }
    );
  }
};

const handleTextareaInput = () => {
  const prevState = textareaState.value;
  if (textareaValue.value.length > 0) {
    textareaState.value = InputState.FILLED;
    
    // Log state transition
    logStateTransition(
      prevState,
      InputState.FILLED,
      UXEventCategory.UI_STATE,
      { inputType: 'textarea', valueLength: textareaValue.value.length },
      { componentIdOverride: 'Textarea' }
    );
  }
};

const handleTextareaBlur = () => {
  const prevState = textareaState.value;
  if (textareaValue.value.length === 0) {
    textareaState.value = InputState.IDLE;
    
    logStateTransition(
      prevState,
      InputState.IDLE,
      UXEventCategory.UI_STATE,
      { inputType: 'textarea', action: 'blur', isEmpty: true },
      { componentIdOverride: 'Textarea' }
    );
  } else {
    textareaState.value = InputState.FILLED;
    
    logStateTransition(
      prevState,
      InputState.FILLED,
      UXEventCategory.UI_STATE,
      { inputType: 'textarea', action: 'blur', valueLength: textareaValue.value.length },
      { componentIdOverride: 'Textarea' }
    );
  }
};

const handleSubmit = async () => {
  const prevState = formState.value;
  formState.value = FormState.SUBMITTING;
  
  // Log form submission start
  logStateTransition(
    prevState,
    FormState.SUBMITTING,
    UXEventCategory.CLICKSTREAM,
    { formId: 'demo-form', email: formEmail.value ? 'provided' : 'empty', message: formMessage.value ? 'provided' : 'empty' },
    { componentIdOverride: 'DemoForm' }
  );
  
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Random success/failure for demo
  const success = Math.random() > 0.5;
  formState.value = success ? FormState.SUCCESS : FormState.ERROR;
  
  // Log form submission result
  logStateTransition(
    FormState.SUBMITTING,
    formState.value,
    UXEventCategory.CLICKSTREAM,
    { formId: 'demo-form', success, duration: 2000 },
    { componentIdOverride: 'DemoForm' }
  );
  
  setTimeout(() => {
    const completedState = formState.value;
    formState.value = FormState.IDLE;
    
    // Log reset
    logStateTransition(
      completedState,
      FormState.IDLE,
      UXEventCategory.UI_STATE,
      { formId: 'demo-form', action: 'reset' },
      { componentIdOverride: 'DemoForm' }
    );
  }, 3000);
};

// State Setters (with telemetry logging)
const setPrimaryState = (state: ButtonState) => {
  const prevState = primaryButtonState.value;
  primaryButtonState.value = state;
  
  // Log manual state change
  logStateTransition(
    prevState,
    state,
    UXEventCategory.UI_STATE,
    { buttonType: 'primary', action: 'manual_state_change' },
    { componentIdOverride: 'PrimaryButton' }
  );
};

const setSecondaryState = (state: ButtonState) => {
  const prevState = secondaryButtonState.value;
  secondaryButtonState.value = state;
  
  // Log manual state change
  logStateTransition(
    prevState,
    state,
    UXEventCategory.UI_STATE,
    { buttonType: 'secondary', action: 'manual_state_change' },
    { componentIdOverride: 'SecondaryButton' }
  );
};

const setIconState = (state: ButtonState) => {
  const prevState = iconButtonState.value;
  iconButtonState.value = state;
  
  // Log manual state change
  logStateTransition(
    prevState,
    state,
    UXEventCategory.UI_STATE,
    { buttonType: 'icon', action: 'manual_state_change' },
    { componentIdOverride: 'IconButton' }
  );
};

const setTextInputState = (state: InputState) => {
  const prevState = textInputState.value;
  textInputState.value = state;
  
  // Log manual state change
  logStateTransition(
    prevState,
    state,
    UXEventCategory.UI_STATE,
    { inputType: 'text', action: 'manual_state_change' },
    { componentIdOverride: 'TextInput' }
  );
};

const setPasswordInputState = (state: InputState) => {
  const prevState = passwordInputState.value;
  passwordInputState.value = state;
  
  // Log manual state change
  logStateTransition(
    prevState,
    state,
    UXEventCategory.UI_STATE,
    { inputType: 'password', action: 'manual_state_change' },
    { componentIdOverride: 'PasswordInput' }
  );
};

const setTextareaState = (state: InputState) => {
  const prevState = textareaState.value;
  textareaState.value = state;
  
  // Log manual state change
  logStateTransition(
    prevState,
    state,
    UXEventCategory.UI_STATE,
    { inputType: 'textarea', action: 'manual_state_change' },
    { componentIdOverride: 'Textarea' }
  );
};

// Statistics and Logging
const componentStates = {
  buttons: {
    primary: Object.values(ButtonState),
    secondary: Object.values(ButtonState),
    icon: Object.values(ButtonState)
  },
  inputs: {
    text: Object.values(InputState),
    password: Object.values(InputState),
    textarea: Object.values(InputState)
  },
  labels: {
    default: ['idle', 'required', 'error', 'disabled', 'loading']
  },
  form: {
    main: Object.values(FormState)
  }
};

const connectors = {
  buttons: {
    primary: {
      onClick: 'handlePrimaryClick()',
      text: 'primaryButtonText (string)',
      state: 'primaryButtonState (idle|hover|pressed|loading|error|disabled)'
    },
    secondary: {
      onClick: 'handleSecondaryClick()',
      text: 'secondaryButtonText (string)',
      state: 'secondaryButtonState (idle|hover|pressed|loading|error|disabled)'
    },
    icon: {
      onClick: 'handleIconClick()',
      src: 'dynamicIcon (string URL)',
      state: 'iconButtonState (idle|hover|pressed|loading|error|disabled)'
    }
  },
  inputs: {
    text: {
      onInput: 'handleTextInput()',
      onFocus: 'textInputState = "focus"',
      onBlur: 'handleTextInputBlur()',
      value: 'textInputValue (string)',
      state: 'textInputState (idle|focus|filled|error|disabled|loading)'
    },
    password: {
      onInput: 'handlePasswordInput()',
      onFocus: 'passwordInputState = "focus"',
      onBlur: 'handlePasswordInputBlur()',
      value: 'passwordInputValue (string)',
      state: 'passwordInputState (idle|focus|filled|error|disabled|loading)'
    },
    textarea: {
      onInput: 'handleTextareaInput()',
      onFocus: 'textareaState = "focus"',
      onBlur: 'handleTextareaBlur()',
      value: 'textareaValue (string)',
      state: 'textareaState (idle|focus|filled|error|disabled|loading)'
    }
  },
  form: {
    onSubmit: 'handleSubmit()',
    state: 'formState (idle|submitting|success|error)',
    email: 'formEmail (string)',
    message: 'formMessage (string)'
  }
};

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

const statsReport = computed(() => {
  const totalStates = 
    componentStates.buttons.primary.length +
    componentStates.buttons.secondary.length +
    componentStates.buttons.icon.length +
    componentStates.inputs.text.length +
    componentStates.inputs.password.length +
    componentStates.inputs.textarea.length +
    componentStates.labels.default.length +
    componentStates.form.main.length;

  return `═══════════════════════════════════════════════════════════
PROGRAMMATIC UI - COMPONENT STATISTICS
═══════════════════════════════════════════════════════════

TOTAL LINES OF CODE: ${getLineCount()}

═══════════════════════════════════════════════════════════
COMPONENT STATES ENUMERATED
═══════════════════════════════════════════════════════════

BUTTONS:
  Primary Button: ${componentStates.buttons.primary.join(', ')}
  Secondary Button: ${componentStates.buttons.secondary.join(', ')}
  Icon Button: ${componentStates.buttons.icon.join(', ')}

INPUTS:
  Text Input: ${componentStates.inputs.text.join(', ')}
  Password Input: ${componentStates.inputs.password.join(', ')}
  Textarea: ${componentStates.inputs.textarea.join(', ')}

LABELS:
  Label: ${componentStates.labels.default.join(', ')}

FORM:
  Form: ${componentStates.form.main.join(', ')}

TOTAL STATES: ${totalStates}

═══════════════════════════════════════════════════════════
CONNECTORS & EXPECTED VALUES
═══════════════════════════════════════════════════════════

BUTTONS:
  Primary:
    - onClick: ${connectors.buttons.primary.onClick}
    - text: ${connectors.buttons.primary.text}
    - state: ${connectors.buttons.primary.state}
  
  Secondary:
    - onClick: ${connectors.buttons.secondary.onClick}
    - text: ${connectors.buttons.secondary.text}
    - state: ${connectors.buttons.secondary.state}
  
  Icon:
    - onClick: ${connectors.buttons.icon.onClick}
    - src: ${connectors.buttons.icon.src}
    - state: ${connectors.buttons.icon.state}

INPUTS:
  Text:
    - onInput: ${connectors.inputs.text.onInput}
    - onFocus: ${connectors.inputs.text.onFocus}
    - onBlur: ${connectors.inputs.text.onBlur}
    - value: ${connectors.inputs.text.value}
    - state: ${connectors.inputs.text.state}
  
  Password:
    - onInput: ${connectors.inputs.password.onInput}
    - onFocus: ${connectors.inputs.password.onFocus}
    - onBlur: ${connectors.inputs.password.onBlur}
    - value: ${connectors.inputs.password.value}
    - state: ${connectors.inputs.password.state}
  
  Textarea:
    - onInput: ${connectors.inputs.textarea.onInput}
    - onFocus: ${connectors.inputs.textarea.onFocus}
    - onBlur: ${connectors.inputs.textarea.onBlur}
    - value: ${connectors.inputs.textarea.value}
    - state: ${connectors.inputs.textarea.state}

FORM:
  - onSubmit: ${connectors.form.onSubmit}
  - state: ${connectors.form.state}
  - email: ${connectors.form.email}
  - message: ${connectors.form.message}

═══════════════════════════════════════════════════════════
CURSOR CHANGE POINTS (${cursorChangePoints.length} total)
═══════════════════════════════════════════════════════════

${cursorChangePoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

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
});

function getLineCount(): number {
  // Approximate line count (template + script + styles)
  return 650; // This will be calculated more accurately in production
}

onMounted(() => {
  console.log(statsReport.value);
});
</script>

<style scoped>
.programmatic-ui {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.stats-panel {
  background: #1a1a1a;
  color: #00ff00;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  overflow-x: auto;
}

.stats-panel h2 {
  margin-top: 0;
  color: #00ff00;
}

.stats-panel pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.main-screen {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.component-section {
  margin-bottom: 40px;
  padding-bottom: 30px;
  border-bottom: 2px solid #e5e7eb;
}

.component-section:last-child {
  border-bottom: none;
}

.component-section h2 {
  color: #111827;
  margin-bottom: 20px;
  font-size: 24px;
}

.button-group,
.input-group,
.label-group {
  margin-bottom: 30px;
}

.button-group h3,
.input-group h3 {
  color: #374151;
  margin-bottom: 10px;
  font-size: 16px;
}

/* Button Styles */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: center;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary.state-idle {
  background: #3b82f6;
}

.btn-primary.state-hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

.btn-primary.state-pressed {
  background: #1d4ed8;
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.btn-primary.state-loading {
  background: #60a5fa;
  cursor: wait;
}

.btn-primary.state-error {
  background: #ef4444;
  cursor: not-allowed;
}

.btn-primary.state-disabled {
  background: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary.state-idle {
  background: #6b7280;
}

.btn-secondary.state-hover {
  background: #4b5563;
  transform: translateY(-1px);
}

.btn-secondary.state-pressed {
  background: #374151;
  transform: translateY(0);
}

.btn-secondary.state-loading {
  background: #9ca3af;
  cursor: wait;
}

.btn-secondary.state-error {
  background: #ef4444;
  cursor: not-allowed;
}

.btn-secondary.state-disabled {
  background: #d1d5db;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-icon {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon img {
  width: 24px;
  height: 24px;
}

.btn-icon.state-idle {
  background: #e5e7eb;
}

.btn-icon.state-hover {
  background: #d1d5db;
  transform: scale(1.1);
}

.btn-icon.state-pressed {
  background: #9ca3af;
  transform: scale(0.95);
}

.btn-icon.state-loading {
  background: #cbd5e1;
  cursor: wait;
}

.btn-icon.state-error {
  background: #fecaca;
  cursor: not-allowed;
}

.btn-icon.state-disabled {
  background: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.5;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.state-controls {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.state-controls button {
  padding: 6px 12px;
  font-size: 12px;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}

.state-controls button:hover {
  background: #e5e7eb;
}

/* Input Styles */
.input-group label {
  display: block;
  margin-bottom: 6px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.input.state-idle {
  border-color: #d1d5db;
  background: white;
}

.input.state-focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input.state-filled {
  border-color: #10b981;
  background: #f0fdf4;
}

.input.state-error {
  border-color: #ef4444;
  background: #fef2f2;
}

.input.state-disabled {
  background: #f3f4f6;
  border-color: #e5e7eb;
  cursor: not-allowed;
  color: #9ca3af;
}

.input.state-loading {
  border-color: #3b82f6;
  background: #eff6ff;
  cursor: wait;
}

.textarea {
  resize: vertical;
  min-height: 100px;
}

.error-message {
  margin-top: 6px;
  color: #ef4444;
  font-size: 12px;
}

.loading-indicator {
  margin-top: 6px;
  color: #3b82f6;
  font-size: 12px;
}

/* Label Styles */
.label-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.label {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.label.state-idle {
  color: #374151;
  background: #f9fafb;
}

.label.state-required {
  color: #dc2626;
  background: #fef2f2;
}

.label.state-error {
  color: #ef4444;
  background: #fef2f2;
}

.label.state-disabled {
  color: #9ca3af;
  background: #f3f4f6;
}

.label.state-loading {
  color: #3b82f6;
  background: #eff6ff;
}

/* Form Styles */
.form {
  max-width: 500px;
}

.form label {
  display: block;
  margin-bottom: 6px;
  margin-top: 16px;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
}

.form label:first-child {
  margin-top: 0;
}

.form input,
.form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  font-family: inherit;
}

.form input:focus,
.form textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form input:disabled,
.form textarea:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.form.state-submitting {
  opacity: 0.7;
  pointer-events: none;
}

.form-error {
  margin-top: 12px;
  padding: 12px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 14px;
}

.form-success {
  margin-top: 12px;
  padding: 12px;
  background: #f0fdf4;
  color: #16a34a;
  border-radius: 6px;
  font-size: 14px;
}

.form button[type="submit"] {
  margin-top: 20px;
  width: 100%;
}
</style>

