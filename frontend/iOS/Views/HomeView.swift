import SwiftUI

/// Home view - room list with pull to refresh
struct HomeView: View {
    @State private var rooms: [Room] = []
    @State private var isLoading = false
    @State private var haptic = UIImpactFeedbackGenerator(style: .light)
    
    var body: some View {
        NavigationStack {
            List(rooms) { room in
                HomeRoomRow(room: room)
                    .swipeActions(edge: .trailing) {
                        Button("Settings") {
                            haptic.impactOccurred()
                            showRoomConfig(room)
                        }
                        .tint(.gray)
                    }
            }
            .refreshable {
                await pullLatestRooms()
            }
            .navigationTitle("Rooms")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        haptic.impactOccurred()
                        // TODO: Show create room
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .task {
            await pullLatestRooms()
        }
    }
    
    private func pullLatestRooms() async {
        isLoading = true
        // TODO: Fetch rooms from API
        // Removed artificial delay - load instantly
        isLoading = false
    }
    
    private func showRoomConfig(_ room: Room) {
        // TODO: Show room settings
    }
}

struct HomeRoomRow: View {
    let room: Room
    @State private var showSettings = false
    
    var body: some View {
        NavigationLink(destination: ChatView(room: room)) {
            HStack {
                Text(room.name ?? "Unnamed Room")
                    .font(.headline)
                    .bold()
                
                Spacer()
                
                if room.isTemp {
                    Text("⏳ \(room.expiryCountdown ?? "")")
                        .foregroundColor(.orange)
                        .font(.caption)
                }
                
                if room.is_self_hosted == true {
                    Text("Self")
                        .foregroundColor(.blue)
                        .font(.caption)
                }
                
                if room.isModerated {
                    Text("🤖 On")
                        .foregroundColor(.purple)
                        .font(.caption)
                }
            }
            .padding(.vertical, 8)
        }
        .swipeActions(edge: .trailing) {
            Button("Settings") {
                showSettings = true
            }
            .tint(.gray)
        }
        .sheet(isPresented: $showSettings) {
            RoomSettingsView(room: room)
        }
    }
}

#Preview {
    HomeView()
}

