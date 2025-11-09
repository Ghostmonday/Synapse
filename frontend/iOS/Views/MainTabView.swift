import SwiftUI

@available(iOS 17.0, *)
struct MainTabView: View {
    @State private var selectedTab: Int = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Home - Dashboard/Rooms overview
            RoomListView()
                .tabItem { 
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)
            
            // Rooms - Full room list
            RoomListView()
                .tabItem { 
                    Label("Rooms", systemImage: "door.left.hand.open")
                }
                .tag(1)
            
            // Settings - Profile + Subscription
            SettingsView()
                .tabItem { 
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(2)
        }
        .onChange(of: selectedTab) { newValue in
            print("[MainTabView] Tab changed to: \(newValue)")
        }
        /// UX: Simple 3-tab navigation - Home, Rooms, Settings
    }
}

#Preview {
    if #available(iOS 17.0, *) {
        MainTabView()
    } else {
        Text("iOS 17.0+ required")
    }
}

