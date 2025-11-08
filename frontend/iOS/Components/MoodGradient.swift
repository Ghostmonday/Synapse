import SwiftUI

struct MoodGradient: View {
    var mood: String
    
    var body: some View {
        let calmColors: [Color] = [Color(hex: "#2A4B7C"), Color(hex: "#4A90E2")]
        let activeColors: [Color] = [Color(hex: "#FF9500"), Color(hex: "#FFCC00")]
        let colors = mood == "calm" ? calmColors : activeColors
        
        return LinearGradient(
            gradient: Gradient(colors: colors),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .animation(.easeInOut(duration: 0.5), value: mood)
        /// UX: Mood-reactive gradients
    }
}

