import Foundation
import Combine
import SwiftUI

/// Emotion pulse types from Redis
enum EmotionPulse: String, Codable {
    case calm = "calm"
    case excited = "excited"
    case anxious = "anxious"
    case neutral = "neutral"
    case joyful = "joyful"
    
    var color: Color {
        switch self {
        case .calm: return Color(hex: "#4A90E2")
        case .excited: return Color(hex: "#FF9500")
        case .anxious: return Color(hex: "#D32F2F")
        case .neutral: return Color.primarySinapse
        case .joyful: return Color(hex: "#00C853")
        }
    }
    
    var animationSpeed: Double {
        switch self {
        case .calm: return 0.5
        case .excited: return 2.0
        case .anxious: return 1.5
        case .neutral: return 1.0
        case .joyful: return 1.8
        }
    }
}

/// Emotion pulse event from Redis
struct EmotionPulseEvent: Codable {
    let pulse: EmotionPulse
    let intensity: Double // 0.0 to 1.0
    let timestamp: Date
    let userId: String?
    
    enum CodingKeys: String, CodingKey {
        case pulse, intensity, timestamp, userId
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let pulseString = try container.decode(String.self, forKey: .pulse)
        pulse = EmotionPulse(rawValue: pulseString) ?? .neutral
        intensity = try container.decode(Double.self, forKey: .intensity)
        
        let timestampString = try container.decode(String.self, forKey: .timestamp)
        let formatter = ISO8601DateFormatter()
        timestamp = formatter.date(from: timestampString) ?? Date()
        
        userId = try container.decodeIfPresent(String.self, forKey: .userId)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(pulse.rawValue, forKey: .pulse)
        try container.encode(intensity, forKey: .intensity)
        let formatter = ISO8601DateFormatter()
        try container.encode(formatter.string(from: timestamp), forKey: .timestamp)
        try container.encodeIfPresent(userId, forKey: .userId)
    }
}

/// Monitor for emotion pulse events from Redis via WebSocket
@MainActor
class EmotionPulseMonitor: ObservableObject {
    static let shared = EmotionPulseMonitor()
    
    @Published var currentPulse: EmotionPulse = .neutral
    @Published var pulseIntensity: Double = 0.5
    
    private var cancellables = Set<AnyCancellable>()
    private var throttleTimer: Timer?
    private var lastUpdateTime: Date = Date()
    
    init() {
        setupWebSocketListener()
    }
    
    private func setupWebSocketListener() {
        WebSocketManager.shared.emotionPulsePublisher
            .throttle(for: .milliseconds(200), scheduler: DispatchQueue.main, latest: true)
            .sink { [weak self] event in
                self?.handleEmotionPulseEvent(event)
            }
            .store(in: &cancellables)
    }
    
    private func handleEmotionPulseEvent(_ event: EmotionPulseEvent) {
        // Throttle UI updates (max 1 per 200ms)
        let now = Date()
        guard now.timeIntervalSince(lastUpdateTime) >= 0.2 else { return }
        
        currentPulse = event.pulse
        pulseIntensity = max(0.0, min(1.0, event.intensity))
        lastUpdateTime = now
    }
}

