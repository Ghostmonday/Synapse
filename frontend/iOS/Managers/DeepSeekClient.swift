import Foundation

class DeepSeekClient {
    static func inferIntent(from text: String) async -> String {
        // Use backend AI endpoint
        do {
            let response = try await AIService.reply(with: text, roomId: UUID().uuidString)
            return response
        } catch {
            return "joinRoom" // Fallback
        }
    }
    
    static func generateReply(from text: String, roomId: String) async -> String {
        do {
            return try await AIService.reply(with: text, roomId: roomId)
        } catch {
            return "AI reply"
        }
    }
}

