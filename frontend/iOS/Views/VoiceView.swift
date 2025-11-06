import SwiftUI

struct VoiceView: View {
    @State private var isRecording = false
    
    var body: some View {
        VoiceOrb(isRecording: $isRecording)
            .sensoryFeedback(.impact(flexibility: .soft), trigger: isRecording)
        /// UX: Mic + waveform + transcript, hold-to-speak 0.24s
    }
}

#Preview {
    VoiceView()
}

