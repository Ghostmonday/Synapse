# Sinapse Design System

A comprehensive, production-ready design system for the Sinapse iOS app with enhanced validation, accessibility, and visual hierarchy.

## Overview

The Sinapse Design System provides a cohesive set of design tokens, components, and patterns that ensure consistency, accessibility, and maintainability across the entire iOS application.

## Key Improvements Over Spec

1. **Enhanced Validation System** - Incremental, real-time validation with debouncing
2. **Better Accessibility** - Comprehensive labels, hints, and Dynamic Type support
3. **Improved Visual Hierarchy** - Multiple shadow levels, better contrast ratios
4. **State Management** - Observable validation states with async support
5. **Error Handling** - Graceful error states with clear messaging
6. **Performance** - Debounced validation, efficient re-renders

## Structure

```
DesignSystem/
├── DesignTokens.swift          # Core design tokens (colors, typography, spacing)
├── Validation/
│   └── DSValidation.swift      # Validation system
├── Components/
│   ├── Atomic/                 # Basic building blocks
│   │   ├── DSButton.swift
│   │   ├── DSChip.swift
│   │   ├── DSAvatar.swift
│   │   ├── DSPresenceOrb.swift
│   │   └── DSDivider.swift
│   ├── Molecular/              # Composite components
│   │   ├── DSTierCard.swift
│   │   ├── DSMessageBubble.swift
│   │   ├── DSSearchField.swift
│   │   └── DSEmptyState.swift
│   └── Organisms/              # Complex components
│       ├── DSChatComposer.swift
│       └── DSRoomRow.swift
└── README.md                   # This file
```

## Design Tokens

### Colors

Semantic color system with automatic light/dark support:

```swift
Color.ds(.bgDefault)        // Background
Color.ds(.textPrimary)      // Primary text
Color.ds(.brandPrimary)     // Brand color
Color.ds(.stateSuccess)     // Success state
Color.ds(.presenceOnline)   // Presence indicator
```

### Typography

Consistent typography scale:

```swift
DSTypography.displayLarge   // 48pt, bold, rounded
DSTypography.title2         // 22pt, semibold
DSTypography.body           // 16pt, regular
DSTypography.caption        // 12pt, regular
```

### Spacing

4pt grid system:

```swift
DSSpacing.xs    // 4pt
DSSpacing.sm    // 8pt
DSSpacing.base  // 16pt
DSSpacing.xl    // 24pt
```

## Validation System

### Basic Usage

```swift
// Simple validation
let validator = DSPredefinedValidators.email
let result = validator.validate("user@example.com")

// Composite validation
let usernameValidator = DSCompositeValidator(
    DSMinLengthRule(minLength: 3),
    DSMaxLengthRule(maxLength: 20),
    DSPatternRule(pattern: "^[a-zA-Z0-9_]+$", message: "Invalid characters")
)
```

### Real-time Validation

```swift
@StateObject private var validationState = DSValidationState(
    validator: DSPredefinedValidators.username,
    debounceInterval: 0.3
)

TextField("Username", text: $validationState.value)
    .onChange(of: validationState.value) { _ in
        validationState.validate()
    }

if validationState.shouldShowError {
    DSValidationErrorView(error: validationState.result.errorMessage ?? "")
}
```

### Predefined Validators

- `DSPredefinedValidators.email` - Email validation
- `DSPredefinedValidators.username` - Username validation
- `DSPredefinedValidators.roomName` - Room name validation
- `DSPredefinedValidators.message` - Message validation
- `DSPredefinedValidators.password` - Password validation

## Components

### Atomic Components

#### Button

```swift
DSPrimaryButton("Get Started", icon: DSIcon.plus) {
    // Action
}

DSSecondaryButton("Cancel") {
    // Action
}

DSIconButton(icon: DSIcon.send, size: .medium) {
    // Action
}
```

#### Avatar

```swift
DSAvatar(
    url: user.avatar,
    name: user.name,
    size: .md,
    presenceStatus: .online,
    isTyping: false
)

DSAvatarStack(avatars: members, maxVisible: 4)
```

#### Presence Orb

```swift
DSPresenceOrb(status: .online, size: .md, isPulsing: true)
```

#### Chip & Badge

```swift
DSChip("Filter", icon: DSIcon.search, isSelected: true) {
    // Action
}

DSBadge("New", variant: .success)
DSTag("Pro", color: .ds(.brandPrimary))
```

### Molecular Components

#### Search Field

```swift
DSSearchField(
    text: $searchText,
    placeholder: "Search rooms...",
    validation: .minLength(2)
)
```

#### Message Bubble

```swift
DSMessageBubble(
    message: MessageViewModel(
        id: UUID(),
        text: "Hello!",
        author: AuthorViewModel(...),
        timestamp: Date(),
        isMine: true,
        readState: .read,
        reactions: [],
        isEdited: false,
        isValid: true,
        validationError: nil
    )
)
```

#### Tier Card

```swift
DSTierCard(
    tier: TierViewModel(...),
    isSelected: true,
    onSelect: { },
    onPurchase: { }
)
```

#### Empty State

```swift
DSEmptyState.rooms {
    // Create room action
}

DSEmptyState.messages()
DSEmptyState.search()
```

### Organism Components

#### Chat Composer

```swift
DSChatComposer(
    text: $messageText,
    placeholder: "Message...",
    onSend: { sendMessage() },
    onAttachment: { showAttachmentPicker() },
    onEmoji: { showEmojiPicker() },
    validation: DSPredefinedValidators.message
)
```

#### Room Row

```swift
DSRoomRow(
    room: RoomViewModel(...),
    onTap: { openRoom() },
    onLongPress: { showRoomOptions() }
)
```

## Usage Examples

### Form with Validation

```swift
struct CreateRoomView: View {
    @StateObject private var nameValidation = DSValidationState(
        validator: DSPredefinedValidators.roomName
    )
    
    var body: some View {
        VStack {
            DSValidatedField(
                title: "Room Name",
                placeholder: "Enter room name",
                validator: DSPredefinedValidators.roomName
            )
            
            DSPrimaryButton("Create", size: .large) {
                if nameValidation.result.isValid {
                    createRoom()
                }
            }
            .disabled(!nameValidation.result.isValid)
        }
    }
}
```

### Message List with Validation

```swift
ForEach(messages) { message in
    DSMessageBubble(
        message: MessageViewModel(
            ...,
            isValid: validateMessage(message),
            validationError: getValidationError(message)
        )
    )
}
```

## Accessibility

All components include:
- Accessibility labels
- Accessibility hints
- Dynamic Type support
- Reduce Motion support
- High contrast support

## Animation

Respects user preferences:

```swift
// Automatically respects Reduce Motion
DSPresenceOrb(status: .online, isPulsing: true)

// Custom animations
.animation(DSAnimation.spring, value: state)
```

## Best Practices

1. **Always use design tokens** - Never hardcode colors, fonts, or spacing
2. **Validate incrementally** - Use debounced validation for better UX
3. **Show errors clearly** - Use DSValidationErrorView for consistent error display
4. **Respect accessibility** - Always provide labels and hints
5. **Test with Dynamic Type** - Ensure components work at all text sizes
6. **Use semantic colors** - Prefer semantic tokens over direct colors

## Migration Guide

### Before (Old Code)

```swift
Button("Send") {
    sendMessage()
}
.foregroundColor(.blue)
.padding(16)
```

### After (Design System)

```swift
DSPrimaryButton("Send", icon: DSIcon.send) {
    sendMessage()
}
```

## Next Steps

1. Add color assets to Assets.xcassets
2. Update existing views to use design system
3. Add more organism components as needed
4. Create component showcase/documentation app
5. Add unit tests for validation system

## Contributing

When adding new components:
1. Follow the atomic → molecular → organism hierarchy
2. Include validation where appropriate
3. Add accessibility labels and hints
4. Support Dynamic Type and Reduce Motion
5. Document usage examples

