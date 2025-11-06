import SwiftUI

@available(iOS 17.0, *)
struct MainTabView: View {
    var body: some View {
        TabView {
            VoiceView().tabItem { Label("Voice", systemImage: "mic") }
            RoomListView().tabItem { Label("Rooms", systemImage: "door.left.hand.open") }
            ChatView().tabItem { Label("Chat", systemImage: "bubble.left") }
            ProfileView().tabItem { Label("Profile", systemImage: "person") }
            DashboardView().tabItem { Label("Dashboard", systemImage: "chart.bar") }
        }
        /// UX: Main tab navigation
    }
}

#Preview {
    if #available(iOS 17.0, *) {
        MainTabView()
    } else {
        Text("iOS 17.0+ required")
    }
}

