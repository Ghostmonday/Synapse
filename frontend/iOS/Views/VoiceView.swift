import SwiftUI

@available(iOS 17.0, *)
struct VoiceView: View {
    @State private var isRecording = false
    @State private var transcript = ""
    @State private var showPermissionAlert = false
    
    var body: some View {
        VStack(spacing: 20) {
            VoiceOrb(isRecording: $isRecording)
                .sensoryFeedback(.impact(flexibility: .soft), trigger: isRecording)
                .onLongPressGesture(minimumDuration: 0.24) {
                    Task {
                        await startRecording()
                    }
                } onPressingChanged: { pressing in
                    if !pressing && isRecording {
                        Task {
                            await stopRecording()
                        }
                    }
                }
            
            if !transcript.isEmpty {
                Text(transcript)
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(8)
            }
        }
        .alert("Microphone Permission Required", isPresented: $showPermissionAlert) {
            Button("Settings") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Please enable microphone access in Settings to use voice features.")
        }
        /// UX: Mic + waveform + transcript, hold-to-speak 0.24s
    }
    
    private func startRecording() async {
        let authorized = await SpeechManager.shared.requestAuthorization()
        guard authorized else {
            showPermissionAlert = true
            return
        }
        
        isRecording = true
        transcript = ""
        
        do {
            let result = try await SpeechManager.shared.transcribe()
            transcript = result
        } catch {
            transcript = "Error: \(error.localizedDescription)"
        }
    }
    
    private func stopRecording() async {
        isRecording = false
        SpeechManager.shared.stopRecording()
    }
}

#Preview {
    if #available(iOS 17.0, *) {
        VoiceView()
    } else {
        Text("iOS 17.0+ required")
    }
}

