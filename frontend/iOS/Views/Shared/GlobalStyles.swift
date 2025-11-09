import SwiftUI

/// Global styling constants - Notes.app meets Signal
extension View {
    /// Standard corner radius
    func sinapseCard() -> some View {
        self.clipShape(RoundedRectangle(cornerRadius: 10))
    }
    
    /// Haptic feedback wrapper
    func withHaptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) -> some View {
        self.onTapGesture {
            let generator = UIImpactFeedbackGenerator(style: style)
            generator.impactOccurred()
        }
    }
}

/// Loading spinner - soft blue, no skeletons
struct SinapseSpinner: View {
    var body: some View {
        ProgressView()
            .tint(.blue)
            .scaleEffect(1.2)
    }
}

/// Standard card component
struct SinapseCard<Content: View>: View {
    let content: Content
    let color: Color
    
    init(color: Color = .blue, @ViewBuilder content: () -> Content) {
        self.color = color
        self.content = content()
    }
    
    var body: some View {
        content
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(color.opacity(0.1))
            )
    }
}

