import SwiftUI

/// Welcome screen - first launch
struct WelcomeView: View {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showRoomOptions = false
    
    var body: some View {
        VStack(spacing: 32) {
            Spacer()
            
            Text("Welcome to Sinapse")
                .font(.system(.largeTitle, weight: .bold))
                .foregroundColor(.blue)
            
            Spacer()
            
            Button("Get Started") {
                showRoomOptions = true
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 40)
            .padding(.bottom, 60)
        }
        .sheet(isPresented: $showRoomOptions) {
            RoomTierView(onComplete: {
                hasCompletedOnboarding = true
            })
        }
    }
}

#Preview {
    WelcomeView()
}

