import Foundation
import Combine

/// Emotional State Monitor
/// Tracks emotional state changes and provides pulse intensity metrics
/// Note: This is a different implementation from Services/EmotionPulseMonitor
@MainActor
class EmotionalStateMonitor: ObservableObject {
    static let shared = EmotionalStateMonitor()
    
    @Published var currentEmotion: EmotionState = .neutral
    @Published var pulseIntensity: Double = 0.5
    @Published var emotionHistory: [EmotionReading] = []
    
    private var cancellables = Set<AnyCancellable>()
    private let maxHistorySize = 100
    
    enum EmotionState: String, Codable {
        case calm
        case excited
        case focused
        case neutral
        case anxious
        case happy
        case sad
        case angry
    }
    
    struct EmotionReading: Identifiable, Codable {
        let id: UUID
        let emotion: EmotionState
        let intensity: Double
        let timestamp: Date
        
        init(emotion: EmotionState, intensity: Double) {
            self.id = UUID()
            self.emotion = emotion
            self.intensity = intensity
            self.timestamp = Date()
        }
    }
    
    private init() {
        startMonitoring()
    }
    
    /// Start monitoring emotional state
    private func startMonitoring() {
        // Monitor for changes every 5 seconds
        Timer.publish(every: 5.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updateEmotion()
            }
            .store(in: &cancellables)
    }
    
    /// Update current emotion based on various signals
    private func updateEmotion() {
        // In production, this would analyze:
        // - Message sentiment
        // - User interaction patterns
        // - Voice tone (if available)
        // - Room activity level
        
        // For now, simulate based on random variation
        let emotions: [EmotionState] = [.calm, .excited, .focused, .neutral, .happy]
        let newEmotion = emotions.randomElement() ?? .neutral
        let newIntensity = Double.random(in: 0.3...0.9)
        
        currentEmotion = newEmotion
        pulseIntensity = newIntensity
        
        // Add to history
        let reading = EmotionReading(emotion: newEmotion, intensity: newIntensity)
        emotionHistory.append(reading)
        
        // Keep history size manageable
        if emotionHistory.count > maxHistorySize {
            emotionHistory.removeFirst()
        }
    }
    
    /// Get average pulse intensity over time window
    func getAverageIntensity(over seconds: TimeInterval = 60) -> Double {
        let cutoff = Date().addingTimeInterval(-seconds)
        let recent = emotionHistory.filter { $0.timestamp >= cutoff }
        
        guard !recent.isEmpty else { return pulseIntensity }
        
        let sum = recent.reduce(0.0) { $0 + $1.intensity }
        return sum / Double(recent.count)
    }
    
    /// Get dominant emotion over time window
    func getDominantEmotion(over seconds: TimeInterval = 60) -> EmotionState {
        let cutoff = Date().addingTimeInterval(-seconds)
        let recent = emotionHistory.filter { $0.timestamp >= cutoff }
        
        guard !recent.isEmpty else { return currentEmotion }
        
        let counts = Dictionary(grouping: recent, by: { $0.emotion })
            .mapValues { $0.count }
        
        return counts.max(by: { $0.value < $1.value })?.key ?? currentEmotion
    }
}

