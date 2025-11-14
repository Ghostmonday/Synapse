# Sinapse iOS App - Screens and Data Architecture

This document contains Mermaid diagrams representing all screens, navigation flow, and associated data models in the Sinapse iOS application.

## Complete Screen and Data Flow Diagram

```mermaid
graph TB
    %% Entry Point
    App[SinapseApp] -->|hasCompletedOnboarding?| Onboarding[OnboardingView]
    App -->|hasCompletedOnboarding| MainTab[MainTabView]
    
    %% Onboarding Flow
    Onboarding -->|Get Started| Welcome[WelcomeView]
    Welcome -->|Select Tier| RoomTier[RoomTierView]
    RoomTier -->|Choose Plan| TierSelect[TierSelectionView]
    TierSelect -->|Complete| OnboardingFlow[OnboardingFlowView]
    OnboardingFlow -->|Finish| MainTab
    
    %% Main Tab Navigation
    MainTab -->|Tab 0| RoomList[RoomListView]
    MainTab -->|Tab 1| Search[SearchView]
    MainTab -->|Tab 2| Profile[ProfileView]
    
    %% Room List Flow
    RoomList -->|Create Room| CreateRoom[CreateRoomSheet]
    RoomList -->|Select Room| Chat[ChatView]
    RoomList -->|View Dashboard| Dashboard[DashboardView]
    RoomList -->|Quick Jump| QuickJump[QuickJumpBar Component]
    
    %% Chat Flow
    Chat -->|View Thread| Thread[ThreadView]
    Chat -->|Settings| RoomSettings[RoomSettingsView]
    Chat -->|Voice| VoiceRoom[VoiceRoomView]
    Chat -->|Paywall| Paywall[PaywallView]
    Chat -->|Message Input| ChatInput[ChatInputView Component]
    Chat -->|Message Display| MessageBubble[MessageBubbleView Component]
    
    %% Voice Flow
    VoiceRoom -->|Video Panel| VideoPanel[VoiceVideoPanelView]
    VoiceRoom -->|Presence| PresenceOrb[PresenceOrbView Component]
    VoiceRoom -->|Paywall| Paywall
    
    %% Profile Flow
    Profile -->|Settings| Settings[SettingsView]
    Profile -->|Pricing| Pricing[PricingSheet]
    Profile -->|Subscription| Subscription[SubscriptionView]
    Profile -->|Paywall| Paywall
    Profile -->|Nicknames| Nicknames[NicknameManagementView]
    Profile -->|Hosting Guide| Hosting[HostingGuideView]
    
    %% Settings Flow
    Settings -->|Bot Setup| BotSetup[BotSetupView]
    
    %% Search Flow
    Search -->|Select Result| Chat
    
    %% Dashboard Flow
    Dashboard -->|View Room| Chat
    Dashboard -->|Presence| PresenceIndicator[PresenceIndicatorView Component]
    
    %% Poll Flow
    Chat -->|View Poll| Poll[PollView]
    
    %% Programmatic UI
    Chat -->|Programmatic UI| ProgrammaticUI[ProgrammaticUIView]
    
    %% Data Models
    RoomList -.->|uses| RoomModel[Room Model]
    Chat -.->|uses| MessageModel[Message Model]
    Chat -.->|uses| RoomModel
    Profile -.->|uses| UserModel[User Model]
    Profile -.->|uses| SubscriptionTier[SubscriptionTier Model]
    Paywall -.->|uses| SubscriptionTier
    Subscription -.->|uses| SubscriptionTier
    VoiceRoom -.->|uses| RoomModel
    Dashboard -.->|uses| TelemetryMetric[TelemetryMetric Model]
    BotSetup -.->|uses| AILog[AILog Model]
    
    %% Styling
    classDef screen fill:#FFD700,stroke:#333,stroke-width:2px,color:#000
    classDef component fill:#2196F3,stroke:#333,stroke-width:1px,color:#fff
    classDef data fill:#4CAF50,stroke:#333,stroke-width:1px,color:#fff
    classDef entry fill:#FF6B6B,stroke:#333,stroke-width:3px,color:#fff
    
    class App,MainTab entry
    class Onboarding,Welcome,RoomTier,TierSelect,OnboardingFlow,RoomList,Search,Profile,Chat,Thread,RoomSettings,VoiceRoom,Dashboard,Settings,Pricing,Subscription,Paywall,Nicknames,Hosting,BotSetup,Poll,ProgrammaticUI,CreateRoom screen
    class ChatInput,MessageBubble,PresenceOrb,VideoPanel,PresenceIndicator,QuickJump component
    class RoomModel,MessageModel,UserModel,SubscriptionTier,TelemetryMetric,AILog data
```

## Data Model Relationships

```mermaid
erDiagram
    USER ||--o{ ROOM : owns
    USER ||--o{ MESSAGE : sends
    USER ||--o{ SUBSCRIPTION : has
    USER ||--o{ PRESENCE : has
    USER ||--o{ TELEMETRY : generates
    
    ROOM ||--o{ MESSAGE : contains
    ROOM ||--o{ USER : has_members
    ROOM ||--o{ THREAD : contains
    ROOM ||--o{ POLL : contains
    ROOM ||--o{ PRESENCE : tracks
    
    MESSAGE ||--o{ REACTION : has
    MESSAGE ||--o{ READ_RECEIPT : has
    MESSAGE }o--|| THREAD : belongs_to
    
    SUBSCRIPTION }o--|| SUBSCRIPTION_TIER : uses
    SUBSCRIPTION ||--o{ ENTITLEMENT : grants
    
    USER {
        UUID id PK
        string name
        string avatar
        string mood
        PresenceStatus presenceStatus
    }
    
    ROOM {
        UUID id PK
        string name
        UUID owner_id FK
        boolean is_public
        string room_tier
        boolean ai_moderation
        timestamp expires_at
        boolean is_self_hosted
        int maxOrbs
        string activityLevel
    }
    
    MESSAGE {
        UUID id PK
        UUID senderId FK
        UUID roomId FK
        string content
        string type
        timestamp timestamp
        string emotion
        string renderedHTML
        UUID threadId FK
    }
    
    REACTION {
        UUID id PK
        UUID messageId FK
        string emoji
        int count
        array userIds
    }
    
    READ_RECEIPT {
        UUID id PK
        UUID messageId FK
        UUID userId FK
        timestamp seenAt
    }
    
    THREAD {
        UUID id PK
        UUID roomId FK
        UUID rootMessageId FK
        string title
        timestamp createdAt
    }
    
    POLL {
        UUID id PK
        UUID roomId FK
        UUID creatorId FK
        string question
        array options
        timestamp expiresAt
    }
    
    SUBSCRIPTION {
        UUID id PK
        UUID userId FK
        string plan
        string status
        timestamp renewalDate
        jsonb entitlements
        string transactionId
        string productId
    }
    
    SUBSCRIPTION_TIER {
        string tier PK
        string displayName
        double monthlyPrice
        string productId
        string color
        string icon
        int maxDailyTokens
        int maxResponseLength
        array availableModels
        int maxAssistants
        AutonomyLevel autonomyLevel
    }
    
    ENTITLEMENT {
        UUID id PK
        UUID subscriptionId FK
        string productId
        boolean active
        timestamp expiresAt
    }
    
    PRESENCE {
        UUID id PK
        UUID userId FK
        UUID roomId FK
        PresenceStatus status
        timestamp lastSeen
    }
    
    TELEMETRY_METRIC {
        UUID id PK
        UUID userId FK
        string eventType
        jsonb metadata
        timestamp timestamp
    }
    
    AILOG {
        UUID id PK
        UUID userId FK
        string action
        jsonb metadata
        timestamp timestamp
    }
```

## Navigation Flow Diagram

```mermaid
stateDiagram-v2
    [*] --> SinapseApp
    
    SinapseApp --> OnboardingView: First Launch
    SinapseApp --> MainTabView: Completed Onboarding
    
    OnboardingView --> WelcomeView: Get Started
    WelcomeView --> RoomTierView: Select Tier
    RoomTierView --> TierSelectionView: Choose Plan
    TierSelectionView --> OnboardingFlowView: Continue
    OnboardingFlowView --> MainTabView: Complete
    
    MainTabView --> RoomListView: Home Tab
    MainTabView --> SearchView: Search Tab
    MainTabView --> ProfileView: Settings Tab
    
    RoomListView --> CreateRoomSheet: Create Room
    RoomListView --> ChatView: Select Room
    RoomListView --> DashboardView: View Dashboard
    
    ChatView --> ThreadView: View Thread
    ChatView --> RoomSettingsView: Room Settings
    ChatView --> VoiceRoomView: Join Voice
    ChatView --> PaywallView: Premium Required
    
    VoiceRoomView --> PaywallView: Premium Required
    VoiceRoomView --> VoiceVideoPanelView: Video Panel
    
    ProfileView --> SettingsView: Settings
    ProfileView --> PricingSheet: Pricing
    ProfileView --> SubscriptionView: Subscription
    ProfileView --> PaywallView: Upgrade
    ProfileView --> NicknameManagementView: Manage Nicknames
    ProfileView --> HostingGuideView: Hosting Guide
    
    SettingsView --> BotSetupView: Setup Bot
    
    SearchView --> ChatView: Select Result
    
    DashboardView --> ChatView: View Room
    
    PaywallView --> SubscriptionView: View Plans
    PaywallView --> [*]: Purchase Complete
    
    [*] --> SinapseApp: App Launch
```

## Component Hierarchy

```mermaid
graph TD
    %% Main App Structure
    SinapseApp --> MainTabView
    SinapseApp --> OnboardingView
    
    %% Tab Views
    MainTabView --> RoomListView
    MainTabView --> SearchView
    MainTabView --> ProfileView
    
    %% Room List Components
    RoomListView --> QuickJumpBar
    RoomListView --> CreateRoomSheet
    
    %% Chat Components
    ChatView --> ChatInputView
    ChatView --> MessageBubbleView
    ChatView --> PresenceIndicatorView
    ChatView --> ReadReceiptIndicator
    
    %% Voice Components
    VoiceRoomView --> VoiceVideoPanelView
    VoiceRoomView --> PresenceOrbView
    
    %% Profile Components
    ProfileView --> PricingSheet
    ProfileView --> SubscriptionView
    
    %% Shared Components
    ChatView --> LoadingSpinner
    RoomListView --> LoadingSpinner
    ProfileView --> LoadingSpinner
    
    ChatView --> ErrorRecoveryView
    RoomListView --> ErrorRecoveryView
    
    ChatView --> ToastView
    ProfileView --> ToastView
    
    ChatView --> EmojiPickerView
    MessageBubbleView --> EmojiPickerView
    
    RoomSettingsView --> FileUploadComponent
    
    %% Styling
    classDef main fill:#FFD700,stroke:#333,stroke-width:3px
    classDef view fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    classDef component fill:#4CAF50,stroke:#333,stroke-width:1px,color:#fff
    
    class SinapseApp,MainTabView main
    class OnboardingView,RoomListView,SearchView,ProfileView,ChatView,VoiceRoomView,CreateRoomSheet,RoomSettingsView,SettingsView,ProfileView view
    class QuickJumpBar,ChatInputView,MessageBubbleView,PresenceIndicatorView,PresenceOrbView,VoiceVideoPanelView,LoadingSpinner,ErrorRecoveryView,ToastView,EmojiPickerView,FileUploadComponent,ReadReceiptIndicator component
```

## Data Flow Diagram

```mermaid
flowchart LR
    %% Data Sources
    API[Backend API] -->|Room Data| RoomModel
    API -->|Message Data| MessageModel
    API -->|User Data| UserModel
    API -->|Subscription| SubscriptionTier
    
    %% Local Storage
    UserDefaults -->|Onboarding State| OnboardingView
    UserDefaults -->|User Preferences| SettingsView
    
    %% StoreKit
    StoreKit[StoreKit 2] -->|Products| PaywallView
    StoreKit -->|Purchases| SubscriptionManager
    SubscriptionManager -->|Entitlements| ProfileView
    SubscriptionManager -->|Entitlements| ChatView
    SubscriptionManager -->|Entitlements| VoiceRoomView
    
    %% ViewModels
    RoomViewModel -->|Room Data| RoomListView
    RoomViewModel -->|Room Data| ChatView
    PresenceViewModel -->|Presence Data| PresenceIndicatorView
    PresenceViewModel -->|Presence Data| PresenceOrbView
    EmotionalAIViewModel -->|Emotion Data| DashboardView
    
    %% Services
    RoomService -->|Room Operations| RoomViewModel
    MessageService -->|Message Operations| ChatView
    AIService -->|AI Operations| ChatView
    AIService -->|AI Operations| BotSetupView
    LiveKitService -->|Voice Tokens| VoiceRoomView
    UXTelemetryService -->|Telemetry| AllViews
    
    %% Data Models to Views
    RoomModel -->|Display| RoomListView
    RoomModel -->|Display| ChatView
    MessageModel -->|Display| ChatView
    MessageModel -->|Display| MessageBubbleView
    UserModel -->|Display| ProfileView
    SubscriptionTier -->|Display| ProfileView
    SubscriptionTier -->|Display| PaywallView
    TelemetryMetric -->|Display| DashboardView
    
    %% Styling
    classDef api fill:#FF6B6B,stroke:#333,stroke-width:2px,color:#fff
    classDef service fill:#9B59B6,stroke:#333,stroke-width:2px,color:#fff
    classDef model fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
    classDef view fill:#2196F3,stroke:#333,stroke-width:2px,color:#fff
    
    class API,StoreKit,UserDefaults api
    class RoomService,MessageService,AIService,LiveKitService,UXTelemetryService,SubscriptionManager service
    class RoomModel,MessageModel,UserModel,SubscriptionTier,TelemetryMetric model
    class RoomListView,ChatView,ProfileView,PaywallView,VoiceRoomView,DashboardView,OnboardingView,SettingsView view
```

## Screen Summary

### Authentication & Onboarding
- **OnboardingView** - Main onboarding entry point
- **WelcomeView** - Welcome screen
- **RoomTierView** - Room tier selection
- **TierSelectionView** - Subscription tier selection
- **OnboardingFlowView** - Multi-step onboarding flow

### Main Navigation
- **MainTabView** - Tab bar container (Home, Search, Settings)
- **RoomListView** - List of all rooms
- **SearchView** - Search messages, rooms, users
- **ProfileView** - User profile and settings

### Communication
- **ChatView** - Main chat interface
- **MessageBubbleView** - Individual message display
- **ChatInputView** - Message input component
- **ThreadView** - Threaded conversations
- **PollView** - Poll creation and voting

### Voice & Video
- **VoiceRoomView** - Voice room interface
- **VoiceVideoPanelView** - Video panel component
- **VoiceView** - Voice controls

### Room Management
- **CreateRoomSheet** - Create new room
- **RoomSettingsView** - Room configuration
- **DashboardView** - Room analytics dashboard

### Profile & Settings
- **SettingsView** - App settings
- **NicknameManagementView** - Manage nicknames
- **HostingGuideView** - Self-hosting guide
- **BotSetupView** - Bot configuration wizard

### Monetization
- **PaywallView** - Subscription paywall
- **SubscriptionView** - Subscription management
- **PricingSheet** - Pricing information

### Components
- **PresenceIndicatorView** - User presence indicator
- **PresenceOrbView** - Presence orb animation
- **QuickJumpBar** - Quick room access
- **LoadingSpinner** - Loading indicator
- **ErrorRecoveryView** - Error handling
- **ToastView** - Toast notifications
- **EmojiPickerView** - Emoji picker
- **FileUploadComponent** - File upload UI
- **ReadReceiptIndicator** - Read receipt display
- **ProgrammaticUIView** - Dynamic UI generation

## Data Models

### Core Models
- **Room** - Room/space data (id, name, owner, tier, moderation, expiry)
- **Message** - Message data (id, sender, content, type, timestamp, emotion, reactions)
- **User** - User profile (id, name, avatar, mood, presence)
- **SubscriptionTier** - Subscription tier configuration (Starter, Pro, Enterprise)

### Supporting Models
- **MessageReaction** - Emoji reactions on messages
- **TelemetryMetric** - Telemetry event data
- **AILog** - AI operation logs
- **IAPReceipt** - In-app purchase receipts
- **UXEventType** - UX event type definitions

