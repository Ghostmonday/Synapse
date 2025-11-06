import Foundation

class MessageService {
    /// Send a message to a room
    static func sendMessage(_ message: Message, to room: Room) async throws {
        let request = SendMessageRequest(
            roomId: room.id.uuidString,
            senderId: message.senderId.uuidString,
            content: message.content,
            type: message.type
        )
        
        try await APIClient.shared.request(
            endpoint: APIClient.Endpoint.messagingSend,
            method: "POST",
            body: request
        )
        
        // Log telemetry
        SystemService.logTelemetry(event: "message.sent", data: ["roomId": room.id.uuidString])
    }
    
    /// Get messages for a room
    static func getMessages(for roomId: UUID) async throws -> [Message] {
        let messages: [Message] = try await APIClient.shared.request(
            endpoint: APIClient.Endpoint.messagingRoom(roomId.uuidString),
            method: "GET"
        )
        
        return messages
    }
}

