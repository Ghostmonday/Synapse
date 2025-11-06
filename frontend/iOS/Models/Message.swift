import Foundation

struct Message: Codable, Identifiable {
    let id: UUID
    let senderId: UUID
    let content: String
    let type: String // "voice" or "text"
    let timestamp: Date
    let emotion: String? /// UX: For resonance layers
    
    enum CodingKeys: String, CodingKey {
        case id
        case senderId = "sender_id"
        case content
        case type
        case timestamp
        case emotion
    }
}

// Request/Response DTOs
struct SendMessageRequest: Codable {
    let roomId: String
    let senderId: String
    let content: String
    let type: String?
    
    enum CodingKeys: String, CodingKey {
        case roomId = "roomId"
        case senderId = "senderId"
        case content
        case type
    }
}

