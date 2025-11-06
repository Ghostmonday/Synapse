import Foundation

struct Room: Codable, Identifiable {
    let id: UUID
    let name: String?
    let owner_id: UUID?
    let is_public: Bool?
    let users: [User]?
    let maxOrbs: Int? /// UX: Organic scalability limit
    let activityLevel: String? /// UX: Triggers ambient feedback
    
    // Backend response mapping
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case owner_id
        case is_public
        case users
        case maxOrbs = "max_orbs"
        case activityLevel = "activity_level"
    }
}

// Backend API response wrapper
struct RoomsResponse: Codable {
    let status: String
    let rooms: [Room]
}

struct RoomResponse: Codable {
    let status: String
    let room: Room
}

