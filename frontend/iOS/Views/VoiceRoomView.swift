import SwiftUI
import Combine

/// Voice Room View
/// Migrated from src/components/VoiceRoomView.vue
/// LiveKit-based voice room with push-to-talk and screen sharing
struct VoiceRoomView: View {
    let roomName: String
    let token: String
    
    @StateObject private var roomManager = LiveKitRoomManager()
    @StateObject private var subManager = SubscriptionManager.shared
    @State private var isPushToTalk: Bool = false
    @State private var latency: Int = 0
    @State private var isPTTActive: Bool = false
    @State private var showPaywall = false
    
    var body: some View {
        Group {
            // Check entitlement before showing voice room
            if !subManager.hasEntitlement(for: "pro_monthly") && !subManager.hasEntitlement(for: "pro_annual") {
                VStack(spacing: 20) {
                    Text("Voice Rooms Require Pro")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(Color("SinapseGold"))
                    
                    Text("Upgrade to Pro to access voice rooms")
                        .foregroundColor(.secondary)
                    
                    Button("View Plans") {
                        showPaywall = true
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color("SinapseGold"))
                }
                .padding()
                .sheet(isPresented: $showPaywall) {
                    SubscriptionView()
                }
            } else {
                voiceRoomContent
            }
        }
    }
    
    private var voiceRoomContent: some View {
        VStack(spacing: 20) {
            // Connection status
            if roomManager.isConnected {
                HStack {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text("Connected - \(latency)ms")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Participants count
            Text("\(roomManager.participants.count + 1) participants")
                .font(.headline)
            
            Spacer()
            
            // Controls
            VStack(spacing: 16) {
                // Push to Talk Button
                Button(action: {
                    togglePushToTalk()
                }) {
                    HStack {
                        Image(systemName: "mic.fill")
                        Text(isPushToTalk ? "Push to Talk: ON" : "Push to Talk: OFF")
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(isPushToTalk ? Color.orange : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .buttonState(isPushToTalk ? .hover : .idle, type: .primary)
                
                // Push to Talk Activation (hold to talk)
                if isPushToTalk {
                    Button(action: {}) {
                        HStack {
                            Image(systemName: "mic.circle.fill")
                            Text(isPTTActive ? "Speaking..." : "Hold to Speak")
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(isPTTActive ? Color.green : Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .simultaneousGesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { _ in
                                if !isPTTActive {
                                    activatePushToTalk()
                                }
                            }
                            .onEnded { _ in
                                if isPTTActive {
                                    deactivatePushToTalk()
                                }
                            }
                    )
                }
                
                // Screen Share Button
                Button(action: {
                    startScreenShare()
                }) {
                    HStack {
                        Image(systemName: "rectangle.on.rectangle")
                        Text("Share Screen")
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.purple)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(!roomManager.isConnected)
            }
            .padding()
        }
        .task {
            await joinRoom()
            startLatencyMonitoring()
        }
        .onDisappear {
            Task {
                await roomManager.leaveRoom()
            }
        }
    }
    
    // MARK: - Methods
    
    private func joinRoom() async {
        do {
            try await roomManager.joinRoom(config: .init(
                roomName: roomName,
                identity: UUID().uuidString, // TODO: Get from auth
                token: token,
                audioEnabled: true,
                videoEnabled: false,
                pushToTalk: isPushToTalk
            ))
            
            UXTelemetryService.logRoomEntry(
                roomId: roomName,
                metadata: ["pushToTalk": isPushToTalk]
            )
        } catch {
            print("[VoiceRoom] Join error: \(error)")
            UXTelemetryService.logAPIFailure(
                endpoint: "/api/voice/join",
                statusCode: 0,
                metadata: ["error": error.localizedDescription]
            )
        }
    }
    
    private func togglePushToTalk() {
        isPushToTalk.toggle()
        
        Task {
            await roomManager.setPushToTalkMode(isPushToTalk)
        }
        
        UXTelemetryService.logStateTransition(
            componentId: "VoiceRoom-PushToTalkToggle",
            stateBefore: isPushToTalk ? "disabled" : "enabled",
            stateAfter: isPushToTalk ? "enabled" : "disabled",
            category: .voiceAV,
            metadata: ["pushToTalk": isPushToTalk]
        )
    }
    
    private func activatePushToTalk() {
        isPTTActive = true
        
        Task {
            await roomManager.activatePushToTalk()
        }
        
        UXTelemetryService.logClick(
            componentId: "VoiceRoom-PTTActivate",
            metadata: ["action": "start"]
        )
    }
    
    private func deactivatePushToTalk() {
        isPTTActive = false
        
        Task {
            await roomManager.deactivatePushToTalk()
        }
        
        UXTelemetryService.logClick(
            componentId: "VoiceRoom-PTTDeactivate",
            metadata: ["action": "stop"]
        )
    }
    
    private func startScreenShare() {
        // TODO: Implement RPScreenRecorder for screen sharing
        print("[VoiceRoom] Starting screen share")
        
        Task {
            await UXTelemetryService.shared.logEvent(
                eventType: .screenShareStart,
                category: .featureUse,
                metadata: ["roomId": roomName],
                componentId: "VoiceRoom"
            )
        }
    }
    
    private func startLatencyMonitoring() {
        Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
            Task { @MainActor in
                let rtt = self.roomManager.getRoundTripTime()
                self.latency = rtt
                
                // Log latency telemetry
                do {
                    let baseURL = APIClient.baseURL
                    guard let url = URL(string: "\(baseURL)/api/voice/log-latency") else { return }
                    
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    
                    struct LatencyLog: Codable {
                        let room: String
                        let latency: Double
                    }
                    let body = LatencyLog(room: self.roomName, latency: Double(rtt))
                    request.httpBody = try JSONEncoder().encode(body)
                    
                    _ = try await URLSession.shared.data(for: request)
                } catch {
                    print("[VoiceRoom] Latency log error: \(error)")
                }
                
                await UXTelemetryService.logPerformance(
                    perceivedMs: rtt,
                    actualMs: rtt,
                    componentId: "VoiceRoom",
                    metadata: ["type": "round_trip_time"]
                )
            }
        }
    }
}

// Extension removed - use UXTelemetryService.shared.logEvent directly

#Preview {
    VoiceRoomView(
        roomName: "test-room",
        token: "mock-token"
    )
}

