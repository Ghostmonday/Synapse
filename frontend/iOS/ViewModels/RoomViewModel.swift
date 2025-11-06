import Foundation
import Combine

class RoomViewModel: ObservableObject {
    @Published var room: Room?
    @Published var messages: [Message] = []
    @Published var isSilent: Bool = false /// UX: Silence empathy
    
    private var silenceTimer: Timer?
    
    func loadRoom(id: UUID) {
        Task {
            do {
                // Load room details
                let rooms = try await RoomService.fetchRooms()
                self.room = rooms.first { $0.id == id }
                
                // Load messages
                self.messages = try await MessageService.getMessages(for: id)
                
                startSilenceDetection()
            } catch {
                print("Room load error: \(error)")
            }
        }
    }
    
    private func startSilenceDetection() {
        silenceTimer?.invalidate()
        silenceTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: false) { _ in
            self.isSilent = true
            // UX: Re-engage with empathy
            Task {
                if let roomId = self.room?.id.uuidString {
                    _ = try? await AIService.reply(with: "Still here? Let's vibe.", roomId: roomId)
                }
            }
        }
    }
    
    deinit {
        silenceTimer?.invalidate()
    }
}

