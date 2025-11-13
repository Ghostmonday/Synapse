import Foundation
import Combine
import SwiftUI

// EmotionPulse and EmotionPulseEvent are defined in Models/UXEventType.swift
// ⚠️ DO NOT REDEFINE - You have been warned. This will haunt you.

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

