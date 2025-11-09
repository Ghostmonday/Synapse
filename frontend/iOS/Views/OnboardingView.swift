import SwiftUI

struct OnboardingView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            Text("Welcome to Sinapse")
                .font(.system(.largeTitle, weight: .bold))
                .foregroundColor(.blue)
            
            Spacer()
            
            Button("Get Started") {
                hasCompletedOnboarding = true
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 40)
            .padding(.bottom, 60)
        }
    }
}

#Preview {
    OnboardingView()
}

