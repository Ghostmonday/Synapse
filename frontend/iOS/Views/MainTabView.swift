import SwiftUI

@available(iOS 17.0, *)
struct MainTabView: View {
    @State private var selectedTab: Int = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            RoomListView()
                .tabItem { 
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)
            
            RoomListView()
                .tabItem { 
                    Label("Rooms", systemImage: "door.left.hand.open")
                }
                .tag(1)
            
            ProfileView()
                .tabItem { 
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(2)
        }
        .tint(.blue)
    }
}

#Preview {
    if #available(iOS 17.0, *) {
        MainTabView()
    } else {
        Text("iOS 17.0+ required")
    }
}

