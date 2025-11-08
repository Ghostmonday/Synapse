import SwiftUI
import AVFoundation
import Combine

/// Voice Video Panel View
/// Migrated from src/components/VoiceVideoPanel.vue
/// Complex component with video grid, controls, device settings, full telemetry
struct VoiceVideoPanelView: View {
    let roomName: String
    let userId: String
    let userName: String?
    let initialAudio: Bool
    let initialVideo: Bool
    
    let onJoined: ((String) -> Void)?
    let onLeft: (() -> Void)?
    let onError: ((String) -> Void)?
    
    @StateObject private var roomManager = LiveKitRoomManager()
    @State private var isConnected: Bool = false
    @State private var localAudioEnabled: Bool = false
    @State private var localVideoEnabled: Bool = false
    @State private var pushToTalkEnabled: Bool = false
    @State private var isLocalSpeaking: Bool = false
    @State private var error: String = ""
    @State private var showDeviceSettings: Bool = false
    @State private var audioDevices: [DeviceInfo] = []
    @State private var videoDevices: [DeviceInfo] = []
    @State private var selectedAudioDevice: String = ""
    @State private var selectedVideoDevice: String = ""
    
    init(
        roomName: String,
        userId: String,
        userName: String? = nil,
        initialAudio: Bool = true,
        initialVideo: Bool = true,
        onJoined: ((String) -> Void)? = nil,
        onLeft: (() -> Void)? = nil,
        onError: ((String) -> Void)? = nil
    ) {
        self.roomName = roomName
        self.userId = userId
        self.userName = userName
        self.initialAudio = initialAudio
        self.initialVideo = initialVideo
        self.onJoined = onJoined
        self.onLeft = onLeft
        self.onError = onError
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Connection Status
            connectionStatusBar
            
            // Video Grid
            ScrollView {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 300))], spacing: 8) {
                    // Local video
                    VideoTileView(
                        participant: localParticipantInfo,
                        isLocal: true
                    )
                    
                    // Remote participants
                    ForEach(roomManager.participants) { lkParticipant in
                        VideoTileView(
                            participant: ParticipantInfo(
                                id: lkParticipant.id,
                                identity: lkParticipant.identity,
                                name: lkParticipant.name,
                                isLocal: false,
                                audioEnabled: lkParticipant.audioEnabled,
                                videoEnabled: lkParticipant.videoEnabled,
                                isSpeaking: lkParticipant.isSpeaking
                            ),
                            isLocal: false
                        )
                    }
                }
                .padding()
            }
            
            // Controls Panel
            controlsPanel
            
            // Device Settings
            if showDeviceSettings {
                deviceSettingsView
            }
            
            // Error Display
            if !error.isEmpty {
                errorMessageView
            }
        }
        .background(Color(hex: "#1a1a1a"))
        .cornerRadius(12)
        .task {
            if initialAudio || initialVideo {
                await joinCall()
            }
        }
        .onDisappear {
            if isConnected {
                Task {
                    await leaveCall()
                }
            }
        }
    }
    
    // MARK: - Subviews
    
    private var connectionStatusBar: some View {
        HStack {
            Circle()
                .fill(isConnected ? Color.green : Color.gray)
                .frame(width: 8, height: 8)
            
            Text(connectionStatusText)
                .font(.caption)
                .foregroundColor(.white)
        }
        .padding(8)
        .frame(maxWidth: .infinity)
        .background(isConnected ? Color.green.opacity(0.8) : Color.gray.opacity(0.8))
    }
    
    private var connectionStatusText: String {
        if !isConnected { return "Disconnected" }
        return "Connected - \(roomManager.participants.count + 1) participants"
    }
    
    private var localParticipantInfo: ParticipantInfo {
        ParticipantInfo(
            id: userId,
            identity: userId,
            name: "You",
            isLocal: true,
            audioEnabled: localAudioEnabled,
            videoEnabled: localVideoEnabled,
            isSpeaking: isLocalSpeaking
        )
    }
    
    private var controlsPanel: some View {
        HStack(spacing: 8) {
            // Audio Control
            controlButton(
                icon: localAudioEnabled ? "mic.fill" : "mic.slash.fill",
                label: pushToTalkEnabled ? "Push to Talk" : (localAudioEnabled ? "Mute" : "Unmute"),
                color: localAudioEnabled ? .gray : .red,
                action: toggleAudio
            )
            .disabled(!isConnected)
            .simultaneousGesture(pushToTalkEnabled ?
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in onPushToTalkStart() }
                    .onEnded { _ in onPushToTalkEnd() }
                : nil
            )
            
            // Video Control
            controlButton(
                icon: localVideoEnabled ? "video.fill" : "video.slash.fill",
                label: localVideoEnabled ? "Stop Video" : "Start Video",
                color: localVideoEnabled ? .gray : .red,
                action: toggleVideo
            )
            .disabled(!isConnected)
            
            // Camera Switch
            controlButton(
                icon: "arrow.triangle.2.circlepath.camera",
                label: "Switch",
                color: .gray,
                action: switchCamera
            )
            .disabled(!isConnected || !localVideoEnabled)
            
            // Push to Talk Toggle
            controlButton(
                icon: "mic.circle.fill",
                label: "PTT",
                color: pushToTalkEnabled ? .orange : .gray,
                action: togglePushToTalk
            )
            .disabled(!isConnected)
            
            // Leave/Join
            controlButton(
                icon: "phone.fill",
                label: isConnected ? "Leave" : "Join",
                color: isConnected ? .red : .green,
                action: {
                    Task {
                        if isConnected {
                            await leaveCall()
                        } else {
                            await joinCall()
                        }
                    }
                }
            )
        }
        .padding()
        .background(Color(hex: "#2d2d2d"))
    }
    
    private func controlButton(icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                Text(label)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .frame(minWidth: 80)
            .padding(12)
            .background(color.opacity(0.8))
            .foregroundColor(.white)
            .cornerRadius(8)
        }
    }
    
    private var deviceSettingsView: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Audio Devices
            VStack(alignment: .leading, spacing: 8) {
                Text("Audio Devices")
                    .font(.caption)
                    .foregroundColor(.white)
                
                Picker("Microphone", selection: $selectedAudioDevice) {
                    Text("Default Microphone").tag("")
                    ForEach(audioDevices) { device in
                        Text(device.label).tag(device.deviceId)
                    }
                }
                .pickerStyle(.menu)
                .onChange(of: selectedAudioDevice) { _ in
                    onAudioDeviceChange()
                }
            }
            
            // Video Devices
            VStack(alignment: .leading, spacing: 8) {
                Text("Camera Devices")
                    .font(.caption)
                    .foregroundColor(.white)
                
                Picker("Camera", selection: $selectedVideoDevice) {
                    Text("Default Camera").tag("")
                    ForEach(videoDevices) { device in
                        Text(device.label).tag(device.deviceId)
                    }
                }
                .pickerStyle(.menu)
                .onChange(of: selectedVideoDevice) { _ in
                    onVideoDeviceChange()
                }
            }
        }
        .padding()
        .background(Color(hex: "#374151"))
        .cornerRadius(8)
        .padding()
    }
    
    private var errorMessageView: some View {
        HStack {
            Text(error)
                .font(.caption)
                .foregroundColor(.white)
            
            Spacer()
            
            Button(action: { error = "" }) {
                Image(systemName: "xmark")
                    .foregroundColor(.white)
            }
        }
        .padding()
        .background(Color.red)
        .cornerRadius(8)
        .padding()
        .transition(.move(edge: .top))
    }
    
    // MARK: - Methods
    
    private func joinCall() async {
        do {
            // Get token from backend
            guard let url = URL(string: "\(APIClient.baseURL)/api/video/join") else {
                throw VoiceVideoPanelError.invalidURL
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let body = JoinRequest(
                roomName: roomName.trimmingCharacters(in: .whitespaces),
                userName: userName?.trimmingCharacters(in: .whitespaces)
            )
            request.httpBody = try JSONEncoder().encode(body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw VoiceVideoPanelError.failedToGetToken
            }
            
            let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
            
            // Join room
            try await roomManager.joinRoom(config: .init(
                roomName: roomName,
                identity: userId,
                token: tokenResponse.token,
                audioEnabled: initialAudio,
                videoEnabled: initialVideo,
                pushToTalk: pushToTalkEnabled
            ))
            
            isConnected = true
            onJoined?(roomName)
            
            // Load devices
            await loadDevices()
            
        } catch {
            self.error = "Failed to join call: \(error.localizedDescription)"
            onError?(self.error)
            
            UXTelemetryService.logAPIFailure(
                endpoint: "/api/video/join",
                statusCode: 0,
                metadata: ["error": error.localizedDescription]
            )
        }
    }
    
    private func leaveCall() async {
        guard isConnected else { return }
        
        do {
            await roomManager.leaveRoom()
            isConnected = false
            onLeft?()
            
            UXTelemetryService.logRoomExit(
                roomId: roomName,
                metadata: ["duration": "unknown"] // TODO: Track session duration
            )
        } catch {
            self.error = "Error leaving call: \(error.localizedDescription)"
            print("[VoiceVideoPanel] Leave error: \(error)")
        }
    }
    
    private func toggleAudio() {
        if pushToTalkEnabled {
            togglePushToTalk()
            return
        }
        
        Task {
            do {
                if !localAudioEnabled {
                    // TODO: Request microphone permission
                    // For now, proceed directly
                    await roomManager.enableAudio()
                }
                
                let newState = await roomManager.toggleAudio()
                await MainActor.run {
                    localAudioEnabled = newState
                }
            } catch {
                await MainActor.run {
                    self.error = "Failed to toggle audio: \(error.localizedDescription)"
                }
            }
        }
    }
    
    private func toggleVideo() {
        Task {
            do {
                if !localVideoEnabled {
                    // TODO: Request camera permission
                    await roomManager.enableVideo()
                }
                
                let newState = await roomManager.toggleVideo()
                await MainActor.run {
                    localVideoEnabled = newState
                }
            } catch {
                await MainActor.run {
                    self.error = "Failed to toggle video: \(error.localizedDescription)"
                }
            }
        }
    }
    
    private func togglePushToTalk() {
        pushToTalkEnabled.toggle()
        
        Task {
            await roomManager.setPushToTalkMode(pushToTalkEnabled)
            
            if !pushToTalkEnabled {
                await MainActor.run {
                    localAudioEnabled = true
                }
            }
        }
    }
    
    private func onPushToTalkStart() {
        guard pushToTalkEnabled else { return }
        
        Task {
            await roomManager.activatePushToTalk()
            await MainActor.run {
                localAudioEnabled = true
            }
        }
    }
    
    private func onPushToTalkEnd() {
        guard pushToTalkEnabled else { return }
        
        Task {
            await roomManager.deactivatePushToTalk()
            await MainActor.run {
                localAudioEnabled = false
            }
        }
    }
    
    private func switchCamera() {
        Task {
            do {
                try await roomManager.switchCamera()
            } catch {
                await MainActor.run {
                    self.error = "Failed to switch camera: \(error.localizedDescription)"
                }
            }
        }
    }
    
    private func loadDevices() async {
        do {
            let audio = await roomManager.getAudioDevices()
            let video = await roomManager.getVideoDevices()
            
            await MainActor.run {
                self.audioDevices = audio
                self.videoDevices = video
            }
        } catch {
            print("[VoiceVideoPanel] Failed to load devices: \(error)")
        }
    }
    
    private func onAudioDeviceChange() {
        guard !selectedAudioDevice.isEmpty else { return }
        
        Task {
            await roomManager.switchAudioDevice(selectedAudioDevice)
        }
    }
    
    private func onVideoDeviceChange() {
        guard !selectedVideoDevice.isEmpty else { return }
        
        Task {
            await roomManager.switchVideoDevice(selectedVideoDevice)
        }
    }
}

// MARK: - Supporting Types

private struct JoinRequest: Codable {
    let roomName: String
    let userName: String?
}

private struct TokenResponse: Codable {
    let token: String
    let serverUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case token
        case serverUrl = "server_url"
    }
}

enum VoiceVideoPanelError: Error {
    case invalidURL
    case failedToGetToken
    case permissionDenied
}

// MARK: - Color Extension
// Note: Color(hex:) is defined in Extensions/Color+Extensions.swift

#Preview {
    VoiceVideoPanelView(
        roomName: "test-room",
        userId: "user123",
        userName: "Test User"
    )
}

