import Foundation

/// UX Event Categories
/// Used for filtering and querying telemetry by functional area
enum UXEventCategory: String, Codable {
    case uiState = "ui_state"
    case clickstream = "clickstream"
    case validation = "validation"
    case system = "system"
    case performance = "performance"
    case voiceAV = "voice_av"
    case messaging = "messaging"
    case engagement = "engagement"
    case emotional = "emotional"
    case presence = "presence"
    case threading = "threading"
    case typing = "typing"
    case featureUse = "feature_use"
    case aiFeedback = "ai_feedback"
    case cognitiveState = "cognitive_state"
    case journeyAnalytics = "journey_analytics"
    case behaviorModeling = "behavior_modeling"
}

/// Core UX Event Types
/// Standard events for tracking user interactions and system states
enum UXEventType: String, Codable {
    // UI State Events
    case uiStateTransition = "ui_state_transition"
    case uiClick = "ui_click"
    case uiValidationError = "ui_validation_error"
    
    // System Events
    case apiFailure = "api_failure"
    case clientCrash = "client_crash"
    
    // Performance Events
    case latencyBucket = "latency_bucket"
    
    // Voice/AV Events
    case voiceCaptureFailed = "voice_capture_failed"
    
    // Messaging Events
    case messageSendAttempted = "message_send_attempted"
    case messageSendFailed = "message_send_failed"
    
    // Engagement Events
    case roomEntry = "room_entry"
    case roomExit = "room_exit"
    
    // Emotional Events
    case messageSentiment = "message_sentiment"
    
    // Presence Events
    case presencePing = "presence_ping"
    
    // Threading Events
    case threadCreated = "thread_created"
    
    // Typing Events
    case typingStart = "typing_start"
    case typingStop = "typing_stop"
    
    // Feature Use Events
    case screenShareStart = "screen_share_start"
    
    // Speculative/AI-Driven Events
    case messageRollback = "message_rollback"
    case messageEmotionDiff = "message_emotion_diff"
    case conversationArcShape = "conversation_arc_shape"
    case presenceSyncLag = "presence_sync_lag"
    case userFlowAbandonment = "user_flow_abandonment"
    case aiDisagreementSignal = "ai_disagreement_signal"
    case contextOverload = "context_overload"
    
    // AI Feedback & Trust Signals
    case aiSuggestionAccepted = "ai_suggestion_accepted"
    case aiSuggestionRejected = "ai_suggestion_rejected"
    case aiAutoFixApplied = "ai_auto_fix_applied"
    case aiEditUndone = "ai_edit_undone"
    case aiHelpRequested = "ai_help_requested"
    case agentHandoffFailed = "agent_handoff_failed"
    
    // Emotional & Cognitive State Signals
    case messageSentimentBefore = "message_sentiment_before"
    case messageSentimentAfter = "message_sentiment_after"
    case sessionEmotionCurve = "session_emotion_curve"
    case messageEmotionContradiction = "message_emotion_contradiction"
    case validationReactIrritationScore = "validation_react_irritation_score"
    
    // Sequence & Journey Analytics
    case eventSequencePath = "event_sequence_path"
    case funnelCheckpointHit = "funnel_checkpoint_hit"
    case dropoffPointDetected = "dropoff_point_detected"
    case repeatedStateLoopDetected = "repeated_state_loop_detected"
    
    // Performance-to-UX Linking
    case loadTimePerceivedVsActual = "load_time_perceived_vs_actual"
    case interactionLatencyMs = "interaction_latency_ms"
    case stutteredInput = "stuttered_input"
    case longStateWithoutProgress = "long_state_without_progress"
    
    // User Archetype / Behavior Modeling
    case userActionBurst = "user_action_burst"
    case sessionIdleThenRetry = "session_idle_then_retry"
    case firstSessionStallPoint = "first_session_stall_point"
    case retryAfterErrorInterval = "retry_after_error_interval"
    case featureToggleHoverNoUse = "feature_toggle_hover_no_use"
}

/// Device Context Information
/// Captured automatically by client SDK
struct DeviceContext: Codable {
    let userAgent: String?
    let screenWidth: CGFloat?
    let screenHeight: CGFloat?
    let viewportWidth: CGFloat?
    let viewportHeight: CGFloat?
    let pixelRatio: CGFloat?
    let platform: String?
    let language: String?
    let connectionType: String?
    let timezone: String?
}

/// UX Telemetry Event Envelope
struct UXTelemetryEvent: Codable {
    let traceId: String
    let sessionId: String
    let eventType: UXEventType
    let category: UXEventCategory
    let timestamp: String
    let componentId: String?
    let stateBefore: String?
    let stateAfter: String?
    let metadata: [String: AnyCodable]
    let deviceContext: DeviceContext?
    let samplingFlag: Bool
    let userId: String?
    let roomId: String?
    
    enum CodingKeys: String, CodingKey {
        case traceId, sessionId, eventType, category, timestamp
        case componentId, stateBefore, stateAfter, metadata
        case deviceContext, samplingFlag, userId, roomId
    }
}

/// Helper for encoding/decoding heterogeneous JSON
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let intValue = try? container.decode(Int.self) {
            value = intValue
        } else if let doubleValue = try? container.decode(Double.self) {
            value = doubleValue
        } else if let stringValue = try? container.decode(String.self) {
            value = stringValue
        } else if let boolValue = try? container.decode(Bool.self) {
            value = boolValue
        } else if let arrayValue = try? container.decode([AnyCodable].self) {
            value = arrayValue.map { $0.value }
        } else if let dictValue = try? container.decode([String: AnyCodable].self) {
            value = dictValue.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let intValue as Int:
            try container.encode(intValue)
        case let doubleValue as Double:
            try container.encode(doubleValue)
        case let stringValue as String:
            try container.encode(stringValue)
        case let boolValue as Bool:
            try container.encode(boolValue)
        case let arrayValue as [Any]:
            try container.encode(arrayValue.map { AnyCodable($0) })
        case let dictValue as [String: Any]:
            try container.encode(dictValue.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

