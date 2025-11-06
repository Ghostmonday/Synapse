import Foundation
import Combine

class PresenceViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var currentMood: String = "calm" /// UX: Emotional attunement
    
    init() {
        // Load initial presence data
        Task {
            await loadPresence()
        }
    }
    
    private func loadPresence() async {
        // TODO: Implement presence loading from backend
        // For now, start with empty users
    }
    
    func joinRoom(_ room: Room) async {
        // Update presence on backend
        do {
            struct PresenceUpdateRequest: Codable {
                let userId: String
                let status: String
            }
            
            // Get current user ID (should be stored after auth)
            let userId = AuthTokenManager.shared.token ?? UUID().uuidString
            
            let request = PresenceUpdateRequest(userId: userId, status: "online")
            try await APIClient.shared.request(
                endpoint: APIClient.Endpoint.presenceUpdate,
                method: "POST",
                body: request
            )
            
            SystemService.logTelemetry(event: "presence.event", data: ["roomId": room.id.uuidString])
        } catch {
            print("Presence update error: \(error)")
        }
        
        // Deferred bootstrap of AIReasoner on first interaction, as per optimizer goals
        await AIReasoner.shared.bootstrap()
    }
}

