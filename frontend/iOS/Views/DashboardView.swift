import SwiftUI
import Combine
import OSLog

/// Dashboard View - Communication Metrics & System Health
/// Shows real-time metrics for rooms, messages, presence, and telemetry
@available(iOS 17.0, *)
struct DashboardView: View {
    @StateObject private var presenceViewModel = PresenceViewModel()
    @StateObject private var emotionMonitor = EmotionPulseMonitor.shared
    @StateObject private var webSocket = WebSocketManager.shared
    @State private var rooms: [Room] = []
    @State private var messageVelocity: Double = 0.0 // Messages per minute
    @State private var activeParticipants: Int = 0
    @State private var presenceDistribution: [String: Int] = [:]
    @State private var cardOffset: CGFloat = 0
    @State private var cardExpanded: Bool = false
    @State private var tapRateTracker = TapRateTracker()
    
    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                cardOffset = value.translation.height
            }
            .onEnded { value in
                let velocity = value.predictedEndLocation.y - value.location.y
                
                // Log swipe gesture telemetry
                UXTelemetryService.shared.logGesture(
                    type: "swipe",
                    velocity: velocity,
                    distance: value.translation.height,
                    componentId: "MetricsCard"
                )
                
                // Auto-expand/collapse if velocity > 500
                if abs(velocity) > 500 {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        cardExpanded = velocity < 0
                        cardOffset = 0
                    }
                } else {
                    // Snap to nearest position
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        if abs(value.translation.height) > 100 {
                            cardExpanded = value.translation.height < 0
                        }
                        cardOffset = 0
                    }
                }
            }
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background gradient with emotion pulse
                MoodGradient(mood: emotionMonitor.currentPulse.rawValue)
                    .ignoresSafeArea()
                    .animation(.easeInOut(duration: emotionMonitor.currentPulse.animationSpeed), value: emotionMonitor.currentPulse)
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Main metrics card
                        MetricsCard(
                            rooms: rooms,
                            messageVelocity: messageVelocity,
                            activeParticipants: activeParticipants,
                            presenceDistribution: presenceDistribution,
                            emotionPulse: emotionMonitor.currentPulse,
                            pulseIntensity: emotionMonitor.pulseIntensity,
                            offset: $cardOffset,
                            expanded: $cardExpanded,
                            geometry: geometry
                        )
                        .gesture(dragGesture)
                        .padding(.horizontal, 16)
                        .padding(.top, 20)
                        
                        // System health cards
                        if cardExpanded {
                            SystemHealthCards()
                                .padding(.horizontal, 16)
                                .transition(.asymmetric(
                                    insertion: .scale.combined(with: .opacity),
                                    removal: .scale.combined(with: .opacity)
                                ))
                                .onAppear {
                                    UXTelemetryService.shared.logSystemHealthViewed(
                                        component: "DashboardView",
                                        status: webSocket.isConnected ? "connected" : "disconnected"
                                    )
                                }
                        }
                    }
                    .padding(.bottom, 40)
                }
            }
        }
        .preferredColorScheme(.dark)
        .task {
            await loadMetrics()
            subscribeToUpdates()
        }
        .onAppear {
            // Subscribe to emotion pulse updates
            emotionMonitor.$currentPulse
                .sink { _ in
                    // UI will reactively update via @Published properties
                }
                .store(in: &cancellables)
        }
    }
    
    @State private var cancellables = Set<AnyCancellable>()
    @State private var messageCountTimer: Timer?
    @State private var messageCount: Int = 0
    
    private func loadMetrics() async {
        // Load rooms
        do {
            rooms = try await RoomService.fetchRooms()
        } catch {
            Logger(subsystem: "com.sinapse.app", category: "DashboardView").error("[DashboardView] Error loading rooms: \(error.localizedDescription)")
        }
        
        // Calculate active participants (users that are online, away, or busy)
        activeParticipants = presenceViewModel.getActiveParticipantsCount()
        
        // Calculate presence distribution from actual user presence status
        presenceDistribution = presenceViewModel.getPresenceDistribution()
        
        // Log telemetry
        UXTelemetryService.shared.logRoomActivityViewed(
            roomCount: rooms.count,
            activeParticipants: activeParticipants
        )
        
        if cardExpanded {
            UXTelemetryService.shared.logPresenceDistributionViewed(distribution: presenceDistribution)
            UXTelemetryService.shared.logMessageVelocityViewed(velocity: messageVelocity)
        }
    }
    
    private func subscribeToUpdates() {
        // Subscribe to WebSocket message events for velocity calculation
        webSocket.messagePublisher
            .sink { [weak self] _ in
                Task { @MainActor in
                    self?.updateMessageVelocity()
                }
            }
            .store(in: &cancellables)
        
        // Subscribe to presence updates with incremental optimization
        webSocket.presencePublisher
            .sink { [weak self] _ in
                Task { @MainActor in
                    // Incremental update: only recalculate metrics, don't reload rooms
                    self?.updatePresenceMetrics()
                }
            }
            .store(in: &cancellables)
        
        // Start message velocity tracking
        startMessageVelocityTracking()
    }
    
    private func startMessageVelocityTracking() {
        messageCountTimer?.invalidate()
        let startTime = Date()
        
        messageCountTimer = Timer.scheduledTimer(withTimeInterval: 60.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self = self else { return }
                let elapsed = Date().timeIntervalSince(startTime)
                self.messageVelocity = elapsed > 0 ? Double(self.messageCount) / (elapsed / 60.0) : 0.0
                self.messageCount = 0
            }
        }
    }
    
    private func updateMessageVelocity() {
        messageCount += 1
    }
    
    /// Incremental presence metrics update (optimized - doesn't reload rooms)
    private func updatePresenceMetrics() {
        // Update active participants from presence view model
        activeParticipants = presenceViewModel.getActiveParticipantsCount()
        
        // Update presence distribution from presence view model
        presenceDistribution = presenceViewModel.getPresenceDistribution()
        
        // Log telemetry for incremental update
        UXTelemetryService.shared.logRoomActivityViewed(
            roomCount: rooms.count,
            activeParticipants: activeParticipants
        )
    }
}

// MARK: - MetricsCard

struct MetricsCard: View {
    let rooms: [Room]
    let messageVelocity: Double
    let activeParticipants: Int
    let presenceDistribution: [String: Int]
    let emotionPulse: EmotionPulse
    let pulseIntensity: Double
    @Binding var offset: CGFloat
    @Binding var expanded: Bool
    let geometry: GeometryProxy
    
    private var cardHeight: CGFloat {
        if expanded {
            return geometry.size.height * 0.6
        } else {
            return 280
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.gray.opacity(0.5))
                .frame(width: 40, height: 4)
                .padding(.top, 8)
            
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    Image(systemName: "chart.bar.fill")
                        .font(.title2)
                        .foregroundColor(emotionPulse.color)
                    
                    Text("Communication Metrics")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                
                // Key metrics grid
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    MetricTile(
                        title: "Active Rooms",
                        value: "\(rooms.count)",
                        icon: "door.left.hand.open",
                        color: .primarySinapse
                    )
                    
                    MetricTile(
                        title: "Message Velocity",
                        value: String(format: "%.1f/min", messageVelocity),
                        icon: "message.fill",
                        color: .primarySinapse
                    )
                    
                    MetricTile(
                        title: "Participants",
                        value: "\(activeParticipants)",
                        icon: "person.2.fill",
                        color: .blue
                    )
                    
                    MetricTile(
                        title: "Presence",
                        value: "\(presenceDistribution["online"] ?? 0) online",
                        icon: "circle.fill",
                        color: .green
                    )
                }
                .padding(.horizontal, 20)
                
                if expanded {
                    // Expanded details
                    PresenceDistributionView(distribution: presenceDistribution)
                        .padding(.horizontal, 20)
                        .padding(.top, 8)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .frame(height: cardHeight + offset)
        .background(
            ZStack {
                // Emotion pulse glow effect
                RoundedRectangle(cornerRadius: 24)
                    .fill(emotionPulse.color.opacity(0.3))
                    .blur(radius: 40)
                    .scaleEffect(1.1 + (pulseIntensity * 0.1))
                    .animation(
                        .easeInOut(duration: emotionPulse.animationSpeed)
                            .repeatForever(autoreverses: true),
                        value: pulseIntensity
                    )
                
                // Main glassmorphic background
                RoundedRectangle(cornerRadius: 24)
                    .fill(.ultraThinMaterial)
                    .opacity(0.8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(Color.glassBorder, lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.2), radius: 20, x: 0, y: 10)
            }
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 16)
        .scaleEffect(pulseIntensity > 0.7 ? 1.02 : 1.0)
        .animation(
            .easeInOut(duration: emotionPulse.animationSpeed * pulseIntensity),
            value: pulseIntensity
        )
        .animation(.spring(response: 0.5, dampingFraction: 0.8), value: expanded)
        .animation(.spring(response: 0.3, dampingFraction: 0.9), value: offset)
    }
}

// MARK: - MetricTile

struct MetricTile: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .font(.title3)
                Spacer()
            }
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.glassBackground)
        .cornerRadius(12)
    }
}

// MARK: - PresenceDistributionView

struct PresenceDistributionView: View {
    let distribution: [String: Int]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Presence Distribution")
                .font(.headline)
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                PresenceRow(status: "Online", count: distribution["online"] ?? 0, color: .green)
                PresenceRow(status: "Away", count: distribution["away"] ?? 0, color: .yellow)
                PresenceRow(status: "Busy", count: distribution["busy"] ?? 0, color: .red)
                PresenceRow(status: "Offline", count: distribution["offline"] ?? 0, color: .gray)
            }
        }
        .padding()
        .background(Color.glassBackground)
        .cornerRadius(12)
    }
}

struct PresenceRow: View {
    let status: String
    let count: Int
    let color: Color
    
    var body: some View {
        HStack {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            
            Text(status)
                .font(.subheadline)
            
            Spacer()
            
            Text("\(count)")
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
}

// MARK: - SystemHealthCards

struct SystemHealthCards: View {
    @ObservedObject var webSocket = WebSocketManager.shared
    
    var body: some View {
        VStack(spacing: 16) {
            SystemHealthCard(
                title: "WebSocket Status",
                status: webSocket.isConnected ? "Connected" : "Disconnected",
                icon: "antenna.radiowaves.left.and.right",
                color: webSocket.isConnected ? .green : .red
            )
            
            SystemHealthCard(
                title: "Telemetry",
                status: "Active",
                icon: "chart.line.uptrend.xyaxis",
                color: .blue
            )
        }
    }
}

struct SystemHealthCard: View {
    let title: String
    let status: String
    let icon: String
    let color: Color
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.title3)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Text(status)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .opacity(0.8)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.glassBorder, lineWidth: 1)
                )
        )
    }
}

#Preview {
    if #available(iOS 17.0, *) {
    DashboardView()
    } else {
        Text("iOS 17.0+ required")
    }
}
