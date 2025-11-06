import SwiftUI

struct LaunchView: View {
    @Binding var hasOnboarded: Bool
    
    var body: some View {
        VStack {
            Text("Welcome to Sinapse")
                .font(.system(.title, design: .rounded))
            Button("Start") {
                hasOnboarded = true
            }
        }
        .background(MoodGradient(mood: "calm"))
        /// UX: Splash + routing
    }
}

#Preview {
    LaunchView(hasOnboarded: .constant(false))
}

