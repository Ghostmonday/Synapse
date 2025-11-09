import SwiftUI

struct RoomListView: View {
    @State private var rooms: [Room] = []
    @State private var isLoading = true
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.voidBlack.opacity(0.8),
                        Color.primarySinapse.opacity(0.1)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()
                
                if isLoading {
                    // Enhanced loading state
                    VStack(spacing: 20) {
                        ProgressView()
                            .scaleEffect(1.5)
                            .tint(.primarySinapse)
                        
                        Text("Loading rooms...")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        Text("Connecting to your spaces")
                            .font(.caption)
                            .foregroundColor(.secondary.opacity(0.7))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity.combined(with: .scale))
                } else if rooms.isEmpty {
                    // Enhanced empty state
                    VStack(spacing: 24) {
                        Image(systemName: "door.left.hand.open")
                            .font(.system(size: 64))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [.primarySinapse, .blue],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .shadow(color: .primarySinapse.opacity(0.3), radius: 10)
                        
                        VStack(spacing: 8) {
                            Text("No rooms available")
                                .font(.title3)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                            
                            Text("Create a room to get started")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Button(action: {
                            // TODO: Show create room sheet
                            print("[RoomListView] Create room tapped")
                        }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Create Room")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(
                                LinearGradient(
                                    colors: [.primarySinapse, .blue],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                            .shadow(color: .primarySinapse.opacity(0.3), radius: 8)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
                    .transition(.opacity.combined(with: .scale))
                } else {
                    // Enhanced room list
                    List {
                        ForEach(rooms) { room in
                            RoomRow(room: room)
                                .listRowBackground(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(.ultraThinMaterial)
                                        .padding(.vertical, 4)
                                )
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Rooms")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        // TODO: Show create room sheet
                        print("[RoomListView] Create room tapped")
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.primarySinapse)
                    }
                }
            }
            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: isLoading)
            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: rooms.isEmpty)
        }
        .task {
            await loadRooms()
        }
        /// UX: Doorway list
    }
    
    private func loadRooms() async {
        isLoading = true
        
        // Simulate loading delay
        try? await Task.sleep(nanoseconds: 300_000_000) // 0.3 seconds
        
        do {
            rooms = try await RoomService.fetchRooms()
        } catch {
            print("Failed to load rooms: \(error)")
            // Fallback: Add dummy room for visibility
            rooms = [createDummyRoom(name: "General")]
        }
        
        isLoading = false
    }
    
    private func createDummyRoom(name: String) -> Room {
        return Room(
            id: UUID(),
            name: name,
            owner_id: UUID(),
            is_public: true,
            users: [],
            maxOrbs: 10,
            activityLevel: "calm"
        )
    }
}

/// Room Row Component with tier icons
struct RoomRow: View {
    let room: Room
    @State private var showSettings = false
    
    var body: some View {
        NavigationLink(destination: ChatView(room: room)) {
            HStack(spacing: 16) {
                // Room icon with tier badges
                ZStack(alignment: .bottomTrailing) {
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.primarySinapse.opacity(0.6), .blue.opacity(0.4)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 50, height: 50)
                    
                    Image(systemName: "door.left.hand.open")
                        .foregroundColor(.white)
                        .font(.title3)
                    
                    // Tier badges
                    if room.isTemp {
                        Image(systemName: "clock.fill")
                            .font(.caption2)
                            .foregroundColor(.orange)
                            .padding(4)
                            .background(Circle().fill(.white))
                            .offset(x: 4, y: 4)
                    } else if room.isModerated {
                        Image(systemName: "shield.checkered")
                            .font(.caption2)
                            .foregroundColor(.green)
                            .padding(4)
                            .background(Circle().fill(.white))
                            .offset(x: 4, y: 4)
                    } else if room.is_self_hosted == true {
                        Image(systemName: "server.rack")
                            .font(.caption2)
                            .foregroundColor(.blue)
                            .padding(4)
                            .background(Circle().fill(.white))
                            .offset(x: 4, y: 4)
                    }
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(room.name ?? "Unnamed Room")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        if room.isTemp, let countdown = room.expiryCountdown {
                            Text("• \(countdown)")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                    
                    HStack(spacing: 8) {
                        if let activityLevel = room.activityLevel {
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(activityColor(activityLevel))
                                    .frame(width: 6, height: 6)
                                
                                Text(activityLevel.capitalized)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        if room.isModerated {
                            Label("Moderated", systemImage: "shield.checkered")
                                .font(.caption2)
                                .foregroundColor(.green)
                        }
                    }
                }
                
                Spacer()
                
                Button(action: {
                    showSettings = true
                }) {
                    Image(systemName: "gearshape.fill")
                        .foregroundColor(.secondary)
                        .font(.caption)
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
        }
        .sheet(isPresented: $showSettings) {
            RoomSettingsView(room: room)
        }
    }
    
    private func activityColor(_ level: String) -> Color {
        switch level.lowercased() {
        case "calm": return .green
        case "active": return .blue
        case "busy": return .orange
        case "intense": return .red
        default: return .gray
        }
    }
}

#Preview {
    RoomListView()
}
