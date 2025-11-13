import Foundation

/// Watchdog Client
/// Fetches recommendations from the backend watchdog API
@MainActor
class WatchdogClient {
    private let baseURL: String
    
    init(baseURL: String? = nil) {
        self.baseURL = baseURL ?? APIClient.baseURL
    }
    
    /// Fetch recommendations from watchdog endpoint
    func fetchRecommendations() async -> [WatchdogRecommendation] {
        guard let url = URL(string: "\(baseURL)/debug/stats?token=\(getDebugToken())") else {
            print("[WatchdogClient] Invalid URL")
            return []
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                print("[WatchdogClient] Invalid response: \(response)")
                return []
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            
            let stats = try decoder.decode(WatchdogStatsResponse.self, from: data)
            
            // Convert watchdog recommendations to our format
            return convertRecommendations(stats)
            
        } catch {
            print("[WatchdogClient] Error fetching recommendations: \(error)")
            return []
        }
    }
    
    /// Fetch emotional metrics
    func fetchEmotionalMetrics() async -> EmotionalMetrics? {
        guard let url = URL(string: "\(baseURL)/debug/stats?token=\(getDebugToken())") else {
            return nil
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let decoder = JSONDecoder()
            let stats = try decoder.decode(WatchdogStatsResponse.self, from: data)
            
            return EmotionalMetrics(
                avgSentiment: stats.emotionalTracking?.avgSentiment ?? 0,
                volatility: stats.emotionalTracking?.volatility ?? 0,
                positiveTrend: stats.emotionalTracking?.positiveTrend ?? false
            )
        } catch {
            print("[WatchdogClient] Error fetching emotional metrics: \(error)")
            return nil
        }
    }
    
    /// Fetch journey metrics
    func fetchJourneyMetrics() async -> JourneyMetrics? {
        guard let url = URL(string: "\(baseURL)/debug/stats?token=\(getDebugToken())") else {
            return nil
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let decoder = JSONDecoder()
            let stats = try decoder.decode(WatchdogStatsResponse.self, from: data)
            
            return JourneyMetrics(
                completionRate: stats.journeyAnalytics?.funnelCompletionRate ?? 0,
                totalCheckpoints: stats.journeyAnalytics?.totalCheckpoints ?? 0,
                totalDropoffs: stats.journeyAnalytics?.totalDropoffs ?? 0
            )
        } catch {
            print("[WatchdogClient] Error fetching journey metrics: \(error)")
            return nil
        }
    }
    
    // MARK: - Private Methods
    
    private func convertRecommendations(_ stats: WatchdogStatsResponse) -> [WatchdogRecommendation] {
        var recommendations: [WatchdogRecommendation] = []
        
        // Convert watchdog recommendations to our format
        for (index, recString) in (stats.watchdogRecommendations ?? []).enumerated() {
            let recommendation = WatchdogRecommendation(
                id: "rec_\(index)_\(UUID().uuidString)",
                pattern: extractPattern(from: recString),
                action: extractAction(from: recString),
                target: extractTarget(from: recString),
                priority: extractPriority(from: recString),
                threshold: 0.0, // Would come from strategy template
                value: 0.0, // Would come from pattern detection
                timestamp: Date()
            )
            
            recommendations.append(recommendation)
        }
        
        return recommendations
    }
    
    private func extractPattern(from recommendation: String) -> String {
        // Parse pattern from recommendation string
        // Example: "High validation error rate detected (22.1%). improve_labels_and_validation"
        if recommendation.contains("validation error") {
            return "high validation error rate"
        } else if recommendation.contains("rollback") {
            return "high message rollback rate"
        } else if recommendation.contains("abandonment") {
            return "high user flow abandonment"
        }
        return "unknown pattern"
    }
    
    private func extractAction(from recommendation: String) -> String {
        // Extract action from recommendation
        // Example: "improve_labels_and_validation"
        if let actionRange = recommendation.range(of: "\\.[a-z_]+", options: .regularExpression) {
            let action = String(recommendation[actionRange].dropFirst())
            return action
        }
        return "unknown_action"
    }
    
    private func extractTarget(from recommendation: String) -> String {
        // Extract target component from recommendation
        // This would ideally come from strategy template
        if recommendation.contains("validation") {
            return "validation_labels"
        } else if recommendation.contains("message") {
            return "message_input"
        }
        return "unknown_target"
    }
    
    private func extractPriority(from recommendation: String) -> WatchdogRecommendation.Priority {
        // Determine priority from recommendation content
        if recommendation.contains("High") {
            return .high
        } else if recommendation.contains("Medium") {
            return .medium
        }
        return .low
    }
    
    private func getDebugToken() -> String {
        // Get debug token from environment or config
        return ProcessInfo.processInfo.environment["DEBUG_TOKEN"] ?? "dev_token"
    }
}

// MARK: - Response Models

struct WatchdogStatsResponse: Codable {
    let timestamp: String?
    let emotionalTracking: EmotionalTracking?
    let journeyAnalytics: JourneyAnalytics?
    let watchdogRecommendations: [String]?
    
    enum CodingKeys: String, CodingKey {
        case timestamp
        case emotionalTracking = "emotional_tracking"
        case journeyAnalytics = "journey_analytics"
        case watchdogRecommendations = "watchdog_recommendations"
    }
}

struct EmotionalTracking: Codable {
    let avgSentiment: Double
    let volatility: Double
    let positiveTrend: Bool
    
    enum CodingKeys: String, CodingKey {
        case avgSentiment = "avg_sentiment"
        case volatility
        case positiveTrend = "positive_trend"
    }
}

struct JourneyAnalytics: Codable {
    let funnelCompletionRate: Double
    let totalCheckpoints: Int
    let totalDropoffs: Int
    
    enum CodingKeys: String, CodingKey {
        case funnelCompletionRate = "funnel_completion_rate"
        case totalCheckpoints = "total_checkpoints"
        case totalDropoffs = "total_dropoffs"
    }
}

struct EmotionalMetrics {
    let avgSentiment: Double
    let volatility: Double
    let positiveTrend: Bool
}

struct JourneyMetrics {
    let completionRate: Double
    let totalCheckpoints: Int
    let totalDropoffs: Int
}

