import SwiftUI

struct OnboardingView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    
    var body: some View {
        ZStack {
            // Splash background - golden synapse icon (no text)
            // Note: Add SplashBackground.png to Assets.xcassets
            if let splashImage = UIImage(named: "SplashBackground") {
                Image(uiImage: splashImage)
                    .resizable()
                    .scaledToFill()
                    .ignoresSafeArea()
                    .overlay(
                        LinearGradient(
                            colors: [Color.black.opacity(0.4), Color.clear],
                            startPoint: .bottom,
                            endPoint: .top
                        )
                    )
            } else {
                // Fallback: Gradient background matching golden theme
                LinearGradient(
                    colors: [
                        Color(red: 0.10, green: 0.06, blue: 0.00),
                        Color(red: 0.20, green: 0.12, blue: 0.00)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
            }
            
            VStack(spacing: 24) {
                Spacer()
                
                Text("Welcome to Sinapse")
                    .font(.largeTitle.bold())
                    .foregroundColor(.white)
                    .shadow(color: Color("SinapseGlow").opacity(0.6), radius: 8)
                
                Spacer()
                
                Button("Start") {
                    hasCompletedOnboarding = true
                }
                .font(.title3.bold())
                .foregroundColor(.black)
                .padding(.horizontal, 44)
                .padding(.vertical, 16)
                .background(
                    Capsule()
                        .fill(Color("SinapseGold"))
                )
                .shadow(color: Color("SinapseGoldDark").opacity(0.6), radius: 6, y: 3)
                .padding(.bottom, 60)
            }
        }
    }
}

#Preview {
    OnboardingView()
}

