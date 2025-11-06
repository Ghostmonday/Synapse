import Foundation

class AIService {
    /// Transcribe voice data (local processing or backend)
    static func transcribe(voiceData: Data) async -> String {
        // TODO: Implement voice transcription
        // This could be local ASR or backend endpoint
        return "Transcribed text"
    }
    
    /// Get AI reply from backend
    static func reply(with prompt: String, roomId: String) async throws -> String {
        let request = AIChatRequest(message: prompt, roomId: roomId)
        let response: AIChatResponse = try await APIClient.shared.request(
            endpoint: APIClient.Endpoint.aiChat,
            method: "POST",
            body: request
        )
        
        return response.message ?? "AI response received"
    }
    
    /// Preload AI service
    static func preload() async {
        // Preload AI configurations or warm up service
        do {
            _ = try await reply(with: "", roomId: UUID().uuidString)
        } catch {
            print("AIService preload error: \(error)")
        }
    }
}

