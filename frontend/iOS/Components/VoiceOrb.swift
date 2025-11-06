import SwiftUI

struct VoiceOrb: View {
    @Binding var isRecording: Bool
    
    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    gradient: Gradient(colors: [.clear, .blue.opacity(0.3)]),
                    center: .center,
                    startRadius: 0,
                    endRadius: 48
                )
            )
            .frame(width: 96, height: 96)
            .gesture(
                LongPressGesture(minimumDuration: 0.24)
                    .onChanged { _ in isRecording = true }
                    .onEnded { _ in isRecording = false }
            )
        /// UX: Voice primacy with 0.24s threshold
    }
}

