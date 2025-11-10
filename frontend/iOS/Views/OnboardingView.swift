import SwiftUI

struct OnboardingView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showContent = false
    @State private var pulseAnimation = false
    
    var body: some View {
        ZStack {
            // Modern gradient background with golden synapse theme
            LinearGradient(
                colors: [
                    Color(red: 0.05, green: 0.03, blue: 0.00), // Deep black-brown
                    Color(red: 0.15, green: 0.10, blue: 0.02), // Rich dark brown
                    Color(red: 0.10, green: 0.06, blue: 0.00)  // SinapseDeep
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            // Animated golden glow effect
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color("SinapseGold").opacity(0.3),
                            Color("SinapseGold").opacity(0.1),
                            Color.clear
                        ],
                        center: .center,
                        startRadius: 50,
                        endRadius: 200
                    )
                )
                .frame(width: 400, height: 400)
                .offset(y: -100)
                .scaleEffect(pulseAnimation ? 1.2 : 1.0)
                .opacity(pulseAnimation ? 0.6 : 0.8)
                .animation(
                    .easeInOut(duration: 2.0)
                    .repeatForever(autoreverses: true),
                    value: pulseAnimation
                )
            
            VStack(spacing: 32) {
                Spacer()
                
                // App Icon/Logo area
                VStack(spacing: 16) {
                    // Sinapse icon placeholder - replace with actual app icon
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color("SinapseGold"),
                                        Color("SinapseGoldDark")
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 120, height: 120)
                            .shadow(color: Color("SinapseGold").opacity(0.5), radius: 20)
                        
                        Image(systemName: "brain.head.profile")
                            .font(.system(size: 60, weight: .light))
                            .foregroundColor(.black)
                    }
                    .scaleEffect(showContent ? 1.0 : 0.8)
                    .opacity(showContent ? 1.0 : 0.0)
                    
                    // App name with glow effect
                    Text("Sinapse")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(Color("SinapseGold"))
                        .shadow(color: Color("SinapseGlow").opacity(0.8), radius: 12)
                        .offset(y: showContent ? 0 : 20)
                        .opacity(showContent ? 1.0 : 0.0)
                    
                    // Tagline
                    Text("Connect. Communicate. Collaborate.")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.7))
                        .multilineTextAlignment(.center)
                        .offset(y: showContent ? 0 : 20)
                        .opacity(showContent ? 1.0 : 0.0)
                }
                
                Spacer()
                
                // Get Started button
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        hasCompletedOnboarding = true
                    }
                }) {
                    HStack(spacing: 12) {
                        Text("Get Started")
                            .font(.title3.bold())
                        Image(systemName: "arrow.right")
                            .font(.title3.bold())
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [
                                        Color("SinapseGold"),
                                        Color("SinapseGoldDark")
                                    ],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                    )
                    .shadow(color: Color("SinapseGold").opacity(0.5), radius: 12, y: 4)
                    .overlay(
                        Capsule()
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 50)
                .offset(y: showContent ? 0 : 30)
                .opacity(showContent ? 1.0 : 0.0)
                .accessibilityLabel("Get Started")
                .accessibilityHint("Double tap to begin using Sinapse")
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8).delay(0.2)) {
                showContent = true
            }
            withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true).delay(0.5)) {
                pulseAnimation = true
            }
        }
    }
}

#Preview {
    OnboardingView()
}

