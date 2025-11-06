import SwiftUI

struct AmbientParticles: View {
    var body: some View {
        ZStack {
            ForEach(0..<20) { _ in
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: CGFloat.random(in: 2...8))
                    .position(
                        x: CGFloat.random(in: 0...UIScreen.main.bounds.width),
                        y: CGFloat.random(in: 0...UIScreen.main.bounds.height)
                    )
                    .animation(
                        .easeInOut(duration: Double.random(in: 2...5))
                        .repeatForever(autoreverses: true),
                        value: UUID()
                    )
            }
        }
        /// UX: Ambient feedback particles
    }
}

