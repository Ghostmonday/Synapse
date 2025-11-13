import Foundation
import Combine

/// Emotional Curve Monitor
/// Monitors emotional metrics and triggers actions on negative trends
@MainActor
class EmotionalCurveMonitor: ObservableObject {
    static let shared = EmotionalCurveMonitor()
    
    @Published var emotionalState: EmotionalState = .neutral
    
    private let watchdogClient: WatchdogClient
    private var monitoringTimer: Timer?
    private var sentimentHistory: [Double] = []
    private let historyLimit = 20
    
    init(watchdogClient: WatchdogClient? = nil) {
        // Initialize WatchdogClient on MainActor
        if let client = watchdogClient {
            self.watchdogClient = client
        } else {
            self.watchdogClient = WatchdogClient()
        }
    }
    
    /// Start monitoring emotional curves
    func startMonitoring() {
        monitoringTimer?.invalidate()
        
        // Poll every 2 minutes
        monitoringTimer = Timer.scheduledTimer(withTimeInterval: 120, repeats: true) { [weak self] _ in
            Task { @MainActor in
                await self?.updateEmotionalState()
            }
        }
        
        // Initial update
        Task { @MainActor in
            await updateEmotionalState()
        }
    }
    
    /// Stop monitoring
    func stopMonitoring() {
        monitoringTimer?.invalidate()
        monitoringTimer = nil
    }
    
    /// Check if rollback should occur based on emotional state
    func shouldRollback() -> Bool {
        // Rollback if volatility is high and trend is negative
        return emotionalState.volatility > 0.4 && emotionalState.trend == .negative
    }
    
    // MARK: - Private Methods
    
    private func updateEmotionalState() async {
        guard let metrics = await watchdogClient.fetchEmotionalMetrics() else {
            return
        }
        
        // Update sentiment history
        sentimentHistory.append(metrics.avgSentiment)
        if sentimentHistory.count > historyLimit {
            sentimentHistory.removeFirst()
        }
        
        // Calculate trend
        let trend = calculateTrend()
        
        // Update emotional state
        emotionalState = EmotionalState(
            sentiment: metrics.avgSentiment,
            volatility: metrics.volatility,
            trend: trend
        )
        
        // Log emotional state change
        if sentimentHistory.count >= 5 {
            let curve = sentimentHistory.map { ["timestamp": Date().timeIntervalSince1970, "score": $0] }
            UXTelemetryService.logEmotionCurve(emotionCurve: curve)
        }
        
        print("[EmotionalCurveMonitor] Updated state - Sentiment: \(metrics.avgSentiment), Volatility: \(metrics.volatility), Trend: \(trend)")
    }
    
    private func calculateTrend() -> EmotionalState.Trend {
        guard sentimentHistory.count >= 5 else {
            return .neutral
        }
        
        // Compare first half vs second half
        let midpoint = sentimentHistory.count / 2
        let firstHalf = sentimentHistory.prefix(midpoint)
        let secondHalf = sentimentHistory.suffix(midpoint)
        
        let firstAvg = firstHalf.reduce(0, +) / Double(firstHalf.count)
        let secondAvg = secondHalf.reduce(0, +) / Double(secondHalf.count)
        
        let difference = secondAvg - firstAvg
        
        if difference > 0.1 {
            return .positive
        } else if difference < -0.1 {
            return .negative
        } else {
            return .neutral
        }
    }
    
    deinit {
        // Invalidate timer directly - deinit cannot be @MainActor
        monitoringTimer?.invalidate()
        monitoringTimer = nil
    }
}

