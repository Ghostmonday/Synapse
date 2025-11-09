import SwiftUI

@available(iOS 17.0, *)
struct MainTabView: View {
    @State private var selectedTab: Int = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            VoiceView()
                .tabItem { Label("Voice", systemImage: "mic") }
                .tag(0)
            
            RoomListView()
                .tabItem { Label("Rooms", systemImage: "door.left.hand.open") }
                .tag(1)
            
            ChatView()
                .tabItem { Label("Chat", systemImage: "bubble.left") }
                .tag(2)
            
            ProfileView()
                .tabItem { Label("Profile", systemImage: "person") }
                .tag(3)
            
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.bar") }
                .tag(4)
        }
        .onChange(of: selectedTab) { newValue in
            print("[MainTabView] Tab changed to: \(newValue)")
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

