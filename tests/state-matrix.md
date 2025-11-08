# UI State Test Matrix

Comprehensive mapping of UI components → states → test coverage (unit, visual, E2E, telemetry).

## Purpose

This matrix ensures:
1. Every component state has corresponding tests
2. Visual regression snapshots exist for each state
3. E2E scenarios exercise state transitions
4. Telemetry assertions validate event emission

## Primary Button

| State | Unit Test | Visual Snapshot | E2E Scenario | Telemetry Assertion |
|-------|-----------|-----------------|--------------|---------------------|
| **IDLE** | ✓ Renders correctly<br>✓ Accepts clicks<br>✓ Text displays | `primary-button-idle.png` | User loads page → button is idle | No event on render |
| **HOVER** | ✓ Hover class applied<br>✓ CSS transitions work | `primary-button-hover.png` | User hovers → state changes to hover | `ui_state_transition` (idle → hover) |
| **PRESSED** | ✓ Pressed class applied<br>✓ Handler fires | `primary-button-pressed.png` | User clicks → state changes to pressed | `ui_state_transition` (hover → pressed)<br>`ui_click` event |
| **LOADING** | ✓ Spinner renders<br>✓ Button disabled<br>✓ Handler blocks | `primary-button-loading.png` | User clicks → async action starts → loading | `ui_state_transition` (pressed → loading) |
| **ERROR** | ✓ Error icon shows<br>✓ Error class applied | `primary-button-error.png` | Action fails → error state | `ui_state_transition` (loading → error) |
| **DISABLED** | ✓ Button disabled<br>✓ No click handler<br>✓ Cursor not-allowed | `primary-button-disabled.png` | Button disabled programmatically | `ui_state_transition` (idle → disabled) |

**E2E Flow**: idle → hover → pressed → loading → idle (success path)  
**E2E Flow**: idle → hover → pressed → loading → error (failure path)

## Secondary Button

| State | Unit Test | Visual Snapshot | E2E Scenario | Telemetry Assertion |
|-------|-----------|-----------------|--------------|---------------------|
| **IDLE** | ✓ Renders correctly<br>✓ Secondary styling | `secondary-button-idle.png` | User loads page | No event on render |
| **HOVER** | ✓ Hover styling<br>✓ CSS transitions | `secondary-button-hover.png` | User hovers | `ui_state_transition` (idle → hover) |
| **PRESSED** | ✓ Pressed styling<br>✓ Handler fires | `secondary-button-pressed.png` | User clicks | `ui_state_transition` (hover → pressed)<br>`ui_click` event |
| **LOADING** | ✓ Spinner renders | `secondary-button-loading.png` | Async action starts | `ui_state_transition` (pressed → loading) |
| **ERROR** | ✓ Error state | `secondary-button-error.png` | Action fails | `ui_state_transition` (loading → error) |
| **DISABLED** | ✓ Disabled state | `secondary-button-disabled.png` | Programmatically disabled | `ui_state_transition` (idle → disabled) |

## Icon Button

| State | Unit Test | Visual Snapshot | E2E Scenario | Telemetry Assertion |
|-------|-----------|-----------------|--------------|---------------------|
| **IDLE** | ✓ Icon renders<br>✓ Circular shape | `icon-button-idle.png` | User loads page | No event on render |
| **HOVER** | ✓ Scale transform<br>✓ Hover styling | `icon-button-hover.png` | User hovers | `ui_state_transition` (idle → hover) |
| **PRESSED** | ✓ Scale down<br>✓ Handler fires | `icon-button-pressed.png` | User clicks | `ui_state_transition` (hover → pressed)<br>`ui_click` event |
| **LOADING** | ✓ Spinner replaces icon | `icon-button-loading.png` | Async action starts | `ui_state_transition` (pressed → loading) |
| **ERROR** | ✓ Error icon shows | `icon-button-error.png` | Action fails | `ui_state_transition` (loading → error) |
| **DISABLED** | ✓ Opacity reduced<br>✓ No interaction | `icon-button-disabled.png` | Programmatically disabled | `ui_state_transition` (idle → disabled) |

## Text Input

| State | Unit Test | Visual Snapshot | E2E Scenario | Telemetry Assertion |
|-------|-----------|-----------------|--------------|---------------------|
| **IDLE** | ✓ Renders empty<br>✓ Placeholder shows | `text-input-idle.png` | User loads form | No event on render |
| **FOCUS** | ✓ Focus styles apply<br>✓ Border highlight | `text-input-focus.png` | User clicks input | `ui_state_transition` (idle → focus) |
| **FILLED** | ✓ Value displayed<br>✓ Filled styling | `text-input-filled.png` | User types text | `ui_state_transition` (focus → filled) |
| **ERROR** | ✓ Error border<br>✓ Error message shows | `text-input-error.png` | Validation fails | `ui_state_transition` (filled → error)<br>`ui_validation_error` event |
| **DISABLED** | ✓ Grayed out<br>✓ No interaction | `text-input-disabled.png` | Input disabled | `ui_state_transition` (idle → disabled) |
| **LOADING** | ✓ Loading indicator<br>✓ Wait cursor | `text-input-loading.png` | Async validation | `ui_state_transition` (filled → loading) |

## Password Input

| State | Unit Test | Visual Snapshot | E2E Scenario | Telemetry Assertion |
|-------|-----------|-----------------|--------------|---------------------|
| **IDLE** | ✓ Renders as password field | `password-input-idle.png` | User loads form | No event on render |
| **FOCUS** | ✓ Focus styles apply | `password-input-focus.png` | User clicks input | `ui_state_transition` (idle → focus) |
| **FILLED** | ✓ Masked value shown | `password-input-filled.png` | User types password | `ui_state_transition` (focus → filled) |
| **ERROR** | ✓ Error styling | `password-input-error.png` | Weak password | `ui_state_transition` (filled → error)<br>`ui_validation_error` event |
| **DISABLED** | ✓ Disabled state | `password-input-disabled.png` | Input disabled | `ui_state_transition` (idle → disabled) |
| **LOADING** | ✓ Checking indicator | `password-input-loading.png` | Password strength check | `ui_state_transition` (filled → loading) |

## Textarea

| State | Unit Test | Visual Snapshot | E2E Scenario | Telemetry Assertion |
|-------|-----------|-----------------|--------------|---------------------|
| **IDLE** | ✓ Renders empty | `textarea-idle.png` | User loads form | No event on render |
| **FOCUS** | ✓ Focus styles | `textarea-focus.png` | User clicks | `ui_state_transition` (idle → focus) |
| **FILLED** | ✓ Multi-line text | `textarea-filled.png` | User types | `ui_state_transition` (focus → filled) |
| **ERROR** | ✓ Error state | `textarea-error.png` | Text too long | `ui_state_transition` (filled → error)<br>`ui_validation_error` event |
| **DISABLED** | ✓ Disabled state | `textarea-disabled.png` | Textarea disabled | `ui_state_transition` (idle → disabled) |
| **LOADING** | ✓ Processing indicator | `textarea-loading.png` | Content processing | `ui_state_transition` (filled → loading) |

## Form

| State | Unit Test | Visual Snapshot | E2E Scenario | Telemetry Assertion |
|-------|-----------|-----------------|--------------|---------------------|
| **IDLE** | ✓ Form renders<br>✓ All inputs enabled | `form-idle.png` | User loads form | No event on render |
| **SUBMITTING** | ✓ Form disabled<br>✓ Submit button shows spinner | `form-submitting.png` | User submits form | `ui_state_transition` (idle → submitting) |
| **SUCCESS** | ✓ Success message shows<br>✓ Success styling | `form-success.png` | Form submitted successfully | `ui_state_transition` (submitting → success) |
| **ERROR** | ✓ Error message shows<br>✓ Error styling | `form-error.png` | Form submission fails | `ui_state_transition` (submitting → error) |

## Test Coverage Summary

| Component | Total States | Unit Tests | Visual Snapshots | E2E Scenarios | Telemetry Tests |
|-----------|-------------|------------|------------------|---------------|-----------------|
| Primary Button | 6 | 6 | 6 | 2 | 12 |
| Secondary Button | 6 | 6 | 6 | 2 | 12 |
| Icon Button | 6 | 6 | 6 | 2 | 12 |
| Text Input | 6 | 6 | 6 | 2 | 12 |
| Password Input | 6 | 6 | 6 | 2 | 12 |
| Textarea | 6 | 6 | 6 | 2 | 12 |
| Form | 4 | 4 | 4 | 2 | 8 |
| **TOTAL** | **40** | **40** | **40** | **14** | **80** |

## Test Templates

### Unit Test Template

```typescript
describe('PrimaryButton', () => {
  describe('State: IDLE', () => {
    it('renders correctly', () => {
      const wrapper = mount(PrimaryButton, {
        props: { state: ButtonState.IDLE }
      });
      expect(wrapper.classes()).toContain('state-idle');
    });
    
    it('accepts clicks', async () => {
      const wrapper = mount(PrimaryButton);
      const handleClick = vi.fn();
      wrapper.vm.$emit = handleClick;
      await wrapper.find('button').trigger('click');
      expect(handleClick).toHaveBeenCalled();
    });
  });
  
  describe('State: LOADING', () => {
    it('shows spinner', () => {
      const wrapper = mount(PrimaryButton, {
        props: { state: ButtonState.LOADING }
      });
      expect(wrapper.find('.spinner').exists()).toBe(true);
    });
    
    it('disables interaction', () => {
      const wrapper = mount(PrimaryButton, {
        props: { state: ButtonState.LOADING }
      });
      expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    });
  });
});
```

### Visual Snapshot Template (Storybook/Chromatic)

```typescript
import { Meta, StoryObj } from '@storybook/vue3';
import PrimaryButton from './PrimaryButton.vue';
import { ButtonState } from '@/types/ui-states';

const meta: Meta<typeof PrimaryButton> = {
  component: PrimaryButton,
};

export default meta;

export const Idle: StoryObj = {
  args: { state: ButtonState.IDLE, text: 'Click Me' },
};

export const Loading: StoryObj = {
  args: { state: ButtonState.LOADING, text: 'Click Me' },
};

export const Error: StoryObj = {
  args: { state: ButtonState.ERROR, text: 'Click Me' },
};
```

### E2E Test Template (Cypress/Playwright)

```typescript
describe('PrimaryButton E2E Flow', () => {
  it('completes happy path: idle → hover → pressed → loading → idle', () => {
    cy.visit('/ui');
    
    // Check initial state
    cy.get('[data-testid="primary-button"]').should('have.class', 'state-idle');
    
    // Hover
    cy.get('[data-testid="primary-button"]').trigger('mouseenter');
    cy.get('[data-testid="primary-button"]').should('have.class', 'state-hover');
    
    // Click
    cy.get('[data-testid="primary-button"]').click();
    cy.get('[data-testid="primary-button"]').should('have.class', 'state-loading');
    
    // Wait for completion
    cy.get('[data-testid="primary-button"]').should('have.class', 'state-idle', { timeout: 3000 });
  });
});
```

### Telemetry Test Template

```typescript
import { logStateTransition } from '@/composables/useUXTelemetry';
import { ButtonState } from '@/types/ui-states';
import { UXEventCategory } from '@/types/ux-telemetry';

describe('PrimaryButton Telemetry', () => {
  it('emits ui_state_transition on click', async () => {
    const spy = vi.spyOn(telemetryService, 'logEvent');
    
    const wrapper = mount(PrimaryButton);
    await wrapper.find('button').trigger('click');
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: UXEventType.UI_STATE_TRANSITION,
        category: UXEventCategory.UI_STATE,
        stateBefore: ButtonState.IDLE,
        stateAfter: ButtonState.LOADING,
      })
    );
  });
  
  it('emits ui_click on click', async () => {
    const spy = vi.spyOn(telemetryService, 'logEvent');
    
    const wrapper = mount(PrimaryButton);
    await wrapper.find('button').trigger('click');
    
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: UXEventType.UI_CLICK,
        category: UXEventCategory.CLICKSTREAM,
        metadata: expect.objectContaining({ buttonType: 'primary' }),
      })
    );
  });
});
```

## Test Priorities

### P0 (Critical - Ship Blockers)
- Primary Button: all states, happy path E2E, telemetry assertions
- Text Input: idle/focus/filled/error states, validation telemetry
- Form: submitting/success/error flow, submission telemetry

### P1 (Important - Launch Within Week)
- Secondary Button: all states, E2E
- Password Input: all states, E2E
- Textarea: all states

### P2 (Nice to Have - Post-Launch)
- Icon Button: all states
- Label states
- Visual regression snapshots for all

## CI Integration

### Pre-Merge Checks (GitHub Actions)

```yaml
name: UI State Tests

on: [pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test -- src/components/__tests__/
      
  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run storybook:build
      - uses: chromatic-com/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_TOKEN }}
          
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:e2e
      
  telemetry-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test -- --testPathPattern=telemetry
```

### Failure Conditions
- Any unit test fails → block merge
- Visual regression detected → require manual review
- E2E flow breaks → block merge
- Telemetry assertion fails → block merge

## Spreadsheet Export (Copy to Google Sheets / Excel)

```
Component,State,Unit Test,Visual Snapshot,E2E Scenario,Telemetry Assertion
Primary Button,IDLE,✓,primary-button-idle.png,Load page,None
Primary Button,HOVER,✓,primary-button-hover.png,Hover,ui_state_transition
Primary Button,PRESSED,✓,primary-button-pressed.png,Click,ui_state_transition + ui_click
Primary Button,LOADING,✓,primary-button-loading.png,Async action,ui_state_transition
Primary Button,ERROR,✓,primary-button-error.png,Action fails,ui_state_transition
Primary Button,DISABLED,✓,primary-button-disabled.png,Programmatic disable,ui_state_transition
Secondary Button,IDLE,✓,secondary-button-idle.png,Load page,None
Secondary Button,HOVER,✓,secondary-button-hover.png,Hover,ui_state_transition
Secondary Button,PRESSED,✓,secondary-button-pressed.png,Click,ui_state_transition + ui_click
Secondary Button,LOADING,✓,secondary-button-loading.png,Async action,ui_state_transition
Secondary Button,ERROR,✓,secondary-button-error.png,Action fails,ui_state_transition
Secondary Button,DISABLED,✓,secondary-button-disabled.png,Programmatic disable,ui_state_transition
Icon Button,IDLE,✓,icon-button-idle.png,Load page,None
Icon Button,HOVER,✓,icon-button-hover.png,Hover,ui_state_transition
Icon Button,PRESSED,✓,icon-button-pressed.png,Click,ui_state_transition + ui_click
Icon Button,LOADING,✓,icon-button-loading.png,Async action,ui_state_transition
Icon Button,ERROR,✓,icon-button-error.png,Action fails,ui_state_transition
Icon Button,DISABLED,✓,icon-button-disabled.png,Programmatic disable,ui_state_transition
Text Input,IDLE,✓,text-input-idle.png,Load form,None
Text Input,FOCUS,✓,text-input-focus.png,Click input,ui_state_transition
Text Input,FILLED,✓,text-input-filled.png,Type text,ui_state_transition
Text Input,ERROR,✓,text-input-error.png,Validation fails,ui_state_transition + ui_validation_error
Text Input,DISABLED,✓,text-input-disabled.png,Programmatic disable,ui_state_transition
Text Input,LOADING,✓,text-input-loading.png,Async validation,ui_state_transition
Password Input,IDLE,✓,password-input-idle.png,Load form,None
Password Input,FOCUS,✓,password-input-focus.png,Click input,ui_state_transition
Password Input,FILLED,✓,password-input-filled.png,Type password,ui_state_transition
Password Input,ERROR,✓,password-input-error.png,Weak password,ui_state_transition + ui_validation_error
Password Input,DISABLED,✓,password-input-disabled.png,Programmatic disable,ui_state_transition
Password Input,LOADING,✓,password-input-loading.png,Strength check,ui_state_transition
Textarea,IDLE,✓,textarea-idle.png,Load form,None
Textarea,FOCUS,✓,textarea-focus.png,Click textarea,ui_state_transition
Textarea,FILLED,✓,textarea-filled.png,Type message,ui_state_transition
Textarea,ERROR,✓,textarea-error.png,Message too long,ui_state_transition + ui_validation_error
Textarea,DISABLED,✓,textarea-disabled.png,Programmatic disable,ui_state_transition
Textarea,LOADING,✓,textarea-loading.png,Content processing,ui_state_transition
Form,IDLE,✓,form-idle.png,Load form,None
Form,SUBMITTING,✓,form-submitting.png,Submit form,ui_state_transition
Form,SUCCESS,✓,form-success.png,Submission succeeds,ui_state_transition
Form,ERROR,✓,form-error.png,Submission fails,ui_state_transition
```

## Boilerplate Generator

Run `npm run generate:test-boilerplate <component> <state>` to generate test files from templates.

---

**Total Test Coverage**: 40 states × 4 test types = 160 test cases + 80 telemetry assertions = **240 total test assertions**

