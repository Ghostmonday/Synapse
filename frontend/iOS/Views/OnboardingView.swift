import SwiftUI
import AuthenticationServices

struct OnboardingView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showContent = false
    @State private var pulseAnimation = false
    @State private var appleAuth = AppleAuthHelper()
    @State private var googleAuth = GoogleAuthHelper()
    
    // Check auth state - if already logged in, skip onboarding instantly
    private var isAuthenticated: Bool {
        AuthTokenManager.shared.token != nil
    }
    
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
                    // Actual logo from assets
                    Image(SynapseColors.logoImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 120, height: 120)
                        .shadow(color: SynapseColors.glow.opacity(0.5), radius: 20)
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
                
                // Auth buttons row
                HStack(spacing: 12) {
                    // Sign In With Apple button
                    Button(action: {
                        Task {
                            await appleAuth.signIn()
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                hasCompletedOnboarding = true
                            }
                        }
                    }) {
                        HStack {
                            Image(systemName: "applelogo")
                            Text("Sign In With Apple")
                                .foregroundColor(.white)
                        }
                        .padding()
                        .background(Color.black)
                        .cornerRadius(8)
                    }
                    .frame(maxWidth: .infinity)
                    .disabled(!appleAuth.isAvailable)
                    .accessibilityLabel("Sign In With Apple")
                    .accessibilityHint("Double tap to sign in with your Apple ID")
                    
                    // Sign In With Google button
                    Button(action: {
                        Task {
                            do {
                                let (idToken, email) = try await googleAuth.signIn()
                                _ = try await AuthService.loginWithGoogle(idToken: idToken, email: email)
                                // Auth successful - route to HomeView
                                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                    hasCompletedOnboarding = true
                                }
                            } catch {
                                print("Google Sign In error: \(error)")
                            }
                        }
                    }) {
                        HStack {
                            // Google G icon - using SF Symbols alternative
                            Text("G")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                            Text("Sign In With Google")
                                .foregroundColor(.white)
                        }
                        .padding()
                        .background(Color.black)
                        .cornerRadius(8)
                    }
                    .frame(maxWidth: .infinity)
                    .disabled(!googleAuth.isAvailable)
                    .accessibilityLabel("Sign In With Google")
                    .accessibilityHint("Double tap to sign in with your Google account")
                }
                .padding(.horizontal, 40)
                .padding(.bottom, 20)
                .offset(y: showContent ? 0 : 30)
                .opacity(showContent ? 1.0 : 0.0)
                
                // Get Started button (skip auth)
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
            // If already authenticated, skip onboarding instantly
            if isAuthenticated {
                hasCompletedOnboarding = true
                return
            }
            
            // Show content instantly - no delays
            withAnimation(.easeOut(duration: 0.6)) {
                showContent = true
            }
            withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
                pulseAnimation = true
            }
        }
        .onChange(of: isAuthenticated) { authenticated in
            // Snap off instantly when auth state changes
            if authenticated {
                withAnimation(.easeOut(duration: 0.2)) {
                    hasCompletedOnboarding = true
                }
            }
        }
    }
}

#Preview {
    OnboardingView()
}

