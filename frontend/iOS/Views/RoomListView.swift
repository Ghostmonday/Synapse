import SwiftUI

struct RoomListView: View {
    @State private var rooms: [Room] = []
    @State private var isLoading = true
    
    var body: some View {
        List(rooms) { room in
            Text(room.name ?? room.id.uuidString)
        }
        .task {
            await loadRooms()
        }
        /// UX: Doorway list
    }
    
    private func loadRooms() async {
        isLoading = true
        do {
            rooms = try await RoomService.fetchRooms()
        } catch {
            print("Failed to load rooms: \(error)")
        }
        isLoading = false
    }
}

#Preview {
    RoomListView()
}

