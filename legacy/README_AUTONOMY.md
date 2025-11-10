# Autonomy Executor System

**Status**: ✅ Complete  
**Date**: 2025-01-27

## Overview

The Autonomy Executor is a comprehensive system that:
- Pulls telemetry from watchdog
- Generates SwiftUI views from pattern templates
- Manages A/B testing with hooks and rollback logic
- Monitors emotional curves and auto-smooths labels on dropoffs
- Injects services via environment objects/coordinator patterns

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Autonomy Executor System                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  AutonomyExecutor (Main Orchestrator)                       │
│  ├─ Fetches recommendations from watchdog                  │
│  ├─ Processes recommendations                              │
│  ├─ Manages A/B tests                                      │
│  └─ Coordinates rollback logic                              │
│                                                             │
│  WatchdogClient                                             │
│  ├─ Fetches recommendations from /debug/stats              │
│  ├─ Fetches emotional metrics                              │
│  └─ Fetches journey metrics                                 │
│                                                             │
│  ViewGenerator                                              │
│  ├─ Generates SwiftUI views from templates                 │
│  ├─ Applies view modifications                             │
│  └─ Manages component registry                             │
│                                                             │
│  ABTestManager                                              │
│  ├─ Manages A/B test experiments                           │
│  ├─ Assigns variants (50/50 split)                         │
│  └─ Tracks conversions                                     │
│                                                             │
│  RollbackManager                                            │
│  ├─ Creates checkpoints before changes                    │
│  ├─ Monitors for rollback conditions                      │
│  └─ Rolls back failed changes                              │
│                                                             │
│  EmotionalCurveMonitor                                      │
│  ├─ Monitors sentiment metrics                            │
│  ├─ Detects negative trends                                │
│  └─ Triggers label smoothing                               │
│                                                             │
│  AutonomyCoordinator                                        │
│  └─ Provides services via environment                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. AutonomyExecutor

Main orchestrator that:
- Polls watchdog every 5 minutes
- Processes recommendations
- Creates A/B tests for high-priority changes
- Monitors rollback conditions
- Auto-smooths labels on emotional dropoffs

**Usage**:
```swift
let executor = AutonomyExecutor.shared
await executor.executeAutonomyCycle()
```

### 2. WatchdogClient

Fetches data from backend watchdog API:
- Recommendations from `/debug/stats`
- Emotional metrics (sentiment, volatility, trend)
- Journey metrics (completion rate, dropoffs)

**Usage**:
```swift
let client = WatchdogClient()
let recommendations = await client.fetchRecommendations()
let emotionalMetrics = await client.fetchEmotionalMetrics()
```

### 3. ViewGenerator

Generates SwiftUI views dynamically from pattern templates:
- Creates views from recommendations
- Applies modifications to existing views
- Manages component registry

**Usage**:
```swift
let generator = ViewGenerator()
if let view = generator.generateView(for: recommendation) {
    // Use generated view
}
```

### 4. ABTestManager

Manages A/B testing:
- Assigns variants (persistent per user)
- Tracks conversions
- Determines rollback conditions

**Usage**:
```swift
let variant = ABTestManager.shared.getVariant(for: "validation_labels")
ABTestManager.shared.recordConversion(experimentId: "exp_123", variant: variant)
```

### 5. RollbackManager

Manages rollback logic:
- Creates checkpoints before changes
- Monitors for negative indicators
- Rolls back failed changes

**Usage**:
```swift
let checkpoint = RollbackManager.shared.createCheckpoint(
    componentId: "validation_labels",
    modification: modification
)
```

### 6. EmotionalCurveMonitor

Monitors emotional metrics:
- Polls emotional metrics every 2 minutes
- Calculates trend (positive/negative/neutral)
- Triggers label smoothing on negative trends

**Usage**:
```swift
let monitor = EmotionalCurveMonitor.shared
monitor.startMonitoring()
if monitor.shouldRollback() {
    // Rollback due to emotional volatility
}
```

### 7. AutonomyCoordinator

Provides services via environment:
- Injected into SwiftUI views
- Provides access to all autonomy services

**Usage**:
```swift
@Environment(\.autonomyCoordinator) var coordinator
let variant = coordinator.abTestManager.getVariant(for: "component_id")
```

## Integration

### 1. App Setup

In `SinapseApp.swift`:
```swift
@StateObject private var autonomyCoordinator = AutonomyCoordinator()

var body: some Scene {
    WindowGroup {
        MainTabView()
            .environmentObject(autonomyCoordinator)
            .task {
                await autonomyCoordinator.executor.executeAutonomyCycle()
            }
    }
}
```

### 2. Using Autonomous Labels

Replace standard labels with `AutonomousLabel`:
```swift
AutonomousLabel(
    componentId: "email_input",
    text: "Email address"
)
```

### 3. Using Autonomous Validation Labels

Replace validation labels with `AutonomousValidationLabel`:
```swift
AutonomousValidationLabel(
    componentId: "email_validation",
    errorText: viewModel.emailError
)
```

### 4. Enabling Autonomy on Components

Add `.autonomyEnabled()` modifier:
```swift
TextField("Email", text: $email)
    .autonomyEnabled(componentId: "email_input")
```

## Features

### A/B Testing

- **Automatic**: High-priority recommendations automatically create A/B tests
- **Persistent**: Variant assignment persists across app launches
- **Conversion Tracking**: Records conversions for each variant
- **Rollback**: Automatically rolls back if treatment performs worse

### Rollback Logic

- **Checkpoints**: Created before each modification
- **Monitoring**: Monitors for negative indicators (emotional volatility, dropoffs)
- **Automatic**: Rolls back if conditions are met
- **Telemetry**: Logs rollback events

### Emotional Curve Monitoring

- **Real-time**: Polls emotional metrics every 2 minutes
- **Trend Detection**: Calculates positive/negative/neutral trends
- **Auto-smoothing**: Automatically smooths labels on negative trends
- **Volatility Detection**: Detects high emotional volatility

### Label Smoothing

- **Automatic**: Triggers on emotional dropoffs or high dropoff rates
- **Harsh Word Replacement**: Replaces harsh words with friendly alternatives
- **Component Registry**: Tracks smoothed labels for rollback

## Pattern Templates

The system responds to these watchdog recommendations:

1. **`improve_labels_and_validation`** - Smooths validation labels
2. **`show_draft_recovery_banner`** - Shows draft recovery UI
3. **`flag_for_ux_review`** - Flags UX issues for review

## Example Flow

1. **Watchdog detects pattern**: "High validation error rate detected (22.1%)"
2. **Recommendation generated**: "improve_labels_and_validation"
3. **AutonomyExecutor processes**: Creates A/B test or applies directly
4. **ViewGenerator generates**: Smoother validation label
5. **RollbackManager creates checkpoint**: Before applying change
6. **Change applied**: Label is smoothed
7. **Monitoring**: Emotional curve monitored for 5 minutes
8. **Rollback if needed**: If emotional volatility increases or dropoffs spike

## Configuration

### Environment Variables

- `DEBUG_TOKEN`: Token for accessing `/debug/stats` endpoint

### Polling Intervals

- **AutonomyExecutor**: 5 minutes (300 seconds)
- **EmotionalCurveMonitor**: 2 minutes (120 seconds)

### A/B Test Thresholds

- **Rollback**: Treatment performs 20% worse than control
- **Completion**: After 1000 conversions

## Telemetry Integration

The system logs:
- View modifications applied
- Rollback events (`ai_edit_undone`)
- Validation irritation scores
- Emotional curve updates (`session_emotion_curve`)

## Future Enhancements

- [ ] More sophisticated view generation (LLM-based)
- [ ] Multi-variant A/B testing (A/B/C)
- [ ] Predictive rollback (before negative impact)
- [ ] Custom pattern templates
- [ ] Real-time emotional state display
- [ ] Journey-based UI optimizations

## Files Created

- `frontend/iOS/Services/AutonomyExecutor.swift`
- `frontend/iOS/Services/WatchdogClient.swift`
- `frontend/iOS/Services/ViewGenerator.swift`
- `frontend/iOS/Services/ABTestManager.swift`
- `frontend/iOS/Services/RollbackManager.swift`
- `frontend/iOS/Services/EmotionalCurveMonitor.swift`
- `frontend/iOS/Coordinators/AutonomyCoordinator.swift`
- `frontend/iOS/Views/Shared/Components/AutonomousLabel.swift`
- `frontend/iOS/Views/Shared/Components/AutonomousValidationLabel.swift`

## Status

✅ **Complete** - All components implemented and integrated

The autonomy executor system is ready for use. It will:
- Automatically pull recommendations from watchdog
- Generate SwiftUI views from templates
- Manage A/B testing
- Roll back failed changes
- Monitor emotional curves
- Auto-smooth labels on dropoffs

