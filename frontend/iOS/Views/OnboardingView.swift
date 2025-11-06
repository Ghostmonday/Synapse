import SwiftUI

struct OnboardingView: View {
    @State private var currentSlide = 0
    
    var body: some View {
        TabView(selection: $currentSlide) {
            Text("Slide 1: Intro").tag(0)
            Text("Slide 2: Permissions").tag(1)
            Text("Slide 3: Ready").tag(2)
        }
        .tabViewStyle(.page)
        /// UX: 3-slide intro + permissions
    }
}

#Preview {
    OnboardingView()
}

