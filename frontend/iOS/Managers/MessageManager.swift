import Foundation

class MessageManager {
    static let shared = MessageManager()
    
    func sendVoiceMessage(data: Data, to room: Room) async {
        let transcript = await AIService.transcribe(voiceData: data)
        let message = Message(
            id: UUID(),
            senderId: UUID(), // TODO: Get from authenticated user
            content: transcript,
            type: "voice",
            timestamp: Date(),
            emotion: "neutral"
        )
        try? await MessageService.sendMessage(message, to: room)
    }
}

