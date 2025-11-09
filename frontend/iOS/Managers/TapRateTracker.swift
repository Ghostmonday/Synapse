import Foundation
import Combine

/// Tap Rate Tracker
/// Monitors user interaction patterns and tap rates for UX telemetry
@MainActor
class TapRateTracker: ObservableObject {
    static let shared = TapRateTracker()
    
    @Published var tapsPerMinute: Double = 0.0
    @Published var totalTaps: Int = 0
    @Published var averageTapInterval: TimeInterval = 0.0
    
    private var tapTimestamps: [Date] = []
    private let maxTimestamps = 1000
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        startTracking()
    }
    
    /// Start tracking tap events
    private func startTracking() {
        // Calculate metrics every 10 seconds
        Timer.publish(every: 10.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updateMetrics()
            }
            .store(in: &cancellables)
    }
    
    /// Record a tap event
    func recordTap() {
        let now = Date()
        tapTimestamps.append(now)
        totalTaps += 1
        
        // Keep timestamps manageable
        if tapTimestamps.count > maxTimestamps {
            tapTimestamps.removeFirst()
        }
        
        updateMetrics()
    }
    
    /// Update calculated metrics
    private func updateMetrics() {
        guard tapTimestamps.count > 1 else {
            tapsPerMinute = 0.0
            averageTapInterval = 0.0
            return
        }
        
        // Calculate taps per minute from last 60 seconds
        let oneMinuteAgo = Date().addingTimeInterval(-60)
        let recentTaps = tapTimestamps.filter { $0 >= oneMinuteAgo }
        tapsPerMinute = Double(recentTaps.count)
        
        // Calculate average interval between taps
        var intervals: [TimeInterval] = []
        for i in 1..<tapTimestamps.count {
            let interval = tapTimestamps[i].timeIntervalSince(tapTimestamps[i-1])
            if interval > 0 && interval < 10.0 { // Ignore very long gaps
                intervals.append(interval)
            }
        }
        
        if !intervals.isEmpty {
            averageTapInterval = intervals.reduce(0, +) / Double(intervals.count)
        }
    }
    
    /// Get tap rate for a specific time window
    func getTapRate(over seconds: TimeInterval) -> Double {
        let cutoff = Date().addingTimeInterval(-seconds)
        let recentTaps = tapTimestamps.filter { $0 >= cutoff }
        return Double(recentTaps.count) / (seconds / 60.0) // Taps per minute
    }
    
    /// Reset tracking data
    func reset() {
        tapTimestamps.removeAll()
        totalTaps = 0
        tapsPerMinute = 0.0
        averageTapInterval = 0.0
    }
}

