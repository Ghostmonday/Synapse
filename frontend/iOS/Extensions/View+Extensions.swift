import SwiftUI

extension View {
    func ambientFeedback() -> some View {
        self.modifier(AmbientParticlesModifier())
    }
}

struct AmbientParticlesModifier: ViewModifier {
    func body(content: Content) -> some View {
        content.overlay(AmbientParticles())
    }
}

