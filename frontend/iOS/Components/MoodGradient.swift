import SwiftUI

struct MoodGradient: View {
    var mood: String
    
    var body: some View {
        LinearGradient(
            gradient: Gradient(
                colors: mood == "calm" 
                    ? [Color(hex: "#2A4B7C"), Color(hex: "#4A90E2")] 
                    : [Color(hex: "#FF9500"), Color(hex: "#FFCC00")]
            ),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .animation(.easeInOut(duration: 0.5), value: mood)
        /// UX: Mood-reactive gradients
    }
}

