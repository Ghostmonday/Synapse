import SwiftUI

struct OnboardingView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showTierSelection = false
    
    var body: some View {
        WelcomeView()
            .onChange(of: showTierSelection) { newValue in
                if newValue {
                    hasCompletedOnboarding = true
                }
            }
    }
}

#Preview {
    OnboardingView()
}

