# Programmatic UI - Complete State Documentation

A comprehensive UI component library with all interactive states explicitly coded and documented.

## Overview

This UI system provides:
- **All states coded**: Every component has idle, hover, pressed, loading, error, and disabled states
- **Clean connectors**: Exposed handlers ready for integration (`onClick={handleSubmit()}`, `src={dynamicImage}`)
- **Complete logging**: Automatic stats generation showing total lines, all states, connectors, and cursor change points

## Files

1. **`src/components/ProgrammaticUI.vue`** - Vue component with all states
2. **`frontend/programmatic-ui-demo.html`** - Standalone HTML demo
3. **`scripts/ui-stats-generator.js`** - Stats generator script

## Type System

### State Enums

All component states are now defined as TypeScript enums in `src/types/ui-states.ts`:

```typescript
import { ButtonState, InputState, FormState } from '@/types/ui-states';

// Button states
const buttonState = ref<ButtonState>(ButtonState.IDLE);

// Input states
const inputState = ref<InputState>(InputState.IDLE);

// Form states
const formState = ref<FormState>(FormState.IDLE);
```

**Benefits**:
- Type safety (no typos)
- Autocomplete in IDE
- Single source of truth
- Linter enforcement

### Connector Interfaces

All component connectors are typed in `src/types/connectors.ts`:

```typescript
import type { ButtonConnector, InputConnector, FormConnector } from '@/types/connectors';

const primaryButton: ButtonConnector = {
  onClick: handlePrimaryClick,
  state: ButtonState.IDLE,
  text: 'Click Me',
  componentId: 'PrimaryButton',
};
```

## Components

### Buttons

**States Enum**: `ButtonState.IDLE | HOVER | PRESSED | LOADING | ERROR | DISABLED`

**Connectors**:
- `onClick={handlePrimaryClick()}` - Primary button click handler
- `onClick={handleSecondaryClick()}` - Secondary button click handler
- `onClick={handleIconClick()}` - Icon button click handler
- `src={dynamicIcon}` - Icon image source (string URL)
- `text={primaryButtonText}` - Button text (string)

**Cursor Changes**:
- `loading` → `wait` cursor
- `disabled` → `not-allowed` cursor
- `error` → `not-allowed` cursor

### Text Inputs

**States Enum**: `InputState.IDLE | FOCUS | FILLED | ERROR | DISABLED | LOADING`

**Connectors**:
- `onInput={handleTextInput()}` - Input change handler
- `onFocus` - Sets state to `focus`
- `onBlur={handleTextInputBlur()}` - Blur handler
- `value={textInputValue}` - Input value (string)
- `state={textInputState}` - Current state

**Cursor Changes**:
- `loading` → `wait` cursor
- `disabled` → `not-allowed` cursor
- `error` → Normal cursor (with error styling)

### Labels

**States Enum**: `LabelState.IDLE | REQUIRED | ERROR | DISABLED | LOADING`

**Usage**: Static display components with visual state indicators

### Forms

**States Enum**: `FormState.IDLE | SUBMITTING | SUCCESS | ERROR`

**Connectors**:
- `onSubmit={handleSubmit()}` - Form submission handler
- `state={formState}` - Form state
- `email={formEmail}` - Email field value
- `message={formMessage}` - Message field value

**Cursor Changes**:
- `submitting` → `wait` cursor on submit button
- Form becomes non-interactive during submission

## Usage

### Vue Component

```vue
<template>
  <ProgrammaticUI />
</template>

<script setup>
import ProgrammaticUI from '@/components/ProgrammaticUI.vue';
</script>
```

### Standalone HTML

Open `frontend/programmatic-ui-demo.html` in a browser. The stats report is automatically generated and displayed at the top.

### Generate Stats Report

```bash
# View stats in console
node scripts/ui-stats-generator.js

# Save stats to file
node scripts/ui-stats-generator.js --save
```

## Statistics

The stats report includes:

1. **Total Lines of Code**: Combined Vue + HTML
2. **Component States Enumerated**: All states for each component type
3. **Connectors & Expected Values**: All exposed handlers and their signatures
4. **Cursor Change Points**: All locations where cursor changes (loading, disabled, error)
5. **Spinner Indicators**: Locations where loading spinners appear

## Integration Guide

### Replacing Placeholder Assets

When real assets are ready, update:

```typescript
// In ProgrammaticUI.vue
const dynamicIcon = ref('/assets/icon.svg'); // Replace with actual asset path
```

### Connecting Real Handlers

Replace placeholder handlers with actual implementations:

```typescript
const handlePrimaryClick = async () => {
  // Your actual logic here
  await submitForm();
};
```

### Customizing States

All states are CSS classes, so you can customize:

```css
.btn-primary.state-loading {
  /* Your custom loading styles */
}
```

## State Flow Examples

### Button Click Flow
1. User clicks → `pressed` state
2. Handler executes → `loading` state (with spinner)
3. Success → `idle` state
4. Error → `error` state

### Input Flow
1. User focuses → `focus` state
2. User types → `filled` state
3. Validation → `loading` or `error` state
4. Blur → `filled` or `idle` state

### Form Submission Flow
1. User submits → `submitting` state
2. API call → Form disabled, spinner on button
3. Success → `success` state (3s) → `idle`
4. Error → `error` state (3s) → `idle`

## Cursor Change Points

Total: **8 cursor change points**

1. Primary button: loading, disabled, error
2. Secondary button: loading, disabled, error
3. Icon button: loading, disabled, error
4. Text input: loading, disabled, error
5. Password input: loading, disabled, error
6. Textarea: loading, disabled, error
7. Form submit button: submitting state
8. All disabled inputs: not-allowed cursor

## Spinner Locations

Total: **4 spinner locations**

1. Primary button (loading state)
2. Secondary button (loading state)
3. Icon button (loading state)
4. Form submit button (submitting state)

## UX Telemetry Integration

### Automatic Telemetry Logging

All state transitions now automatically emit UX telemetry events:

```typescript
import { useUXTelemetry } from '@/composables/useUXTelemetry';
import { UXEventCategory } from '@/types/ux-telemetry';

const { logStateTransition, logClick } = useUXTelemetry();

// State transition logging (automatic)
const handleClick = () => {
  const prevState = buttonState.value;
  buttonState.value = ButtonState.LOADING;
  
  // Automatically logs to ux_telemetry table
  logStateTransition(
    prevState,
    ButtonState.LOADING,
    UXEventCategory.UI_STATE,
    { buttonType: 'primary', action: 'click' }
  );
};
```

### Telemetry Events Emitted

Every interactive element emits telemetry:

| Component | Events | Category |
|-----------|--------|----------|
| Buttons | `ui_click`, `ui_state_transition` | `clickstream`, `ui_state` |
| Inputs | `ui_state_transition` | `ui_state` |
| Form | `ui_state_transition`, `ui_validation_error` (on error) | `clickstream`, `validation` |

### UX Telemetry System

This component is integrated with the **standalone UX Telemetry System** (separate from system/infra telemetry):

- **Client SDK**: Zero-dependency, browser/Node compatible
- **PII Scrubbing**: Automatic at client and server levels
- **Sampling**: Critical events 100%, high-frequency 10%
- **Storage**: `ux_telemetry` table (separate from system `telemetry`)
- **LLM Observer**: AI agent monitors patterns and suggests optimizations

See `src/telemetry/ux/README.md` for complete telemetry documentation.

### Viewing Telemetry Data

**Debug Endpoint** (requires token in production):
```
GET /debug/stats?token=YOUR_DEBUG_TOKEN
```

Returns:
- Recent event summary (last 24 hours)
- Category rollups
- Click counts, validation errors, state transitions

**API Queries**:
```
GET /api/ux-telemetry/category/ui_state
GET /api/ux-telemetry/session/:sessionId
GET /api/ux-telemetry/summary/recent
```

## Testing

### Test Matrix

See `tests/state-matrix.md` for complete test coverage matrix:
- 40 component states
- 40 unit tests
- 40 visual snapshots
- 14 E2E scenarios
- 80 telemetry assertions

**Total**: 240 test assertions

### Running Tests

```bash
# Unit tests
npm test -- src/components/__tests__/ProgrammaticUI.test.ts

# Visual regression (Storybook/Chromatic)
npm run storybook:build
npm run chromatic

# E2E tests
npm run test:e2e -- --spec tests/e2e/programmatic-ui.spec.ts

# Telemetry tests
npm test -- --testPathPattern=telemetry
```

## Notes

- All states use TypeScript enums - no string literals
- Connectors are fully typed with interfaces
- Stats report is auto-generated on component mount
- HTML demo works standalone without build step
- Vue component integrates seamlessly with existing Vue apps
- **UX telemetry automatically logs all interactions**
- **LLM observer can detect patterns and suggest improvements**

