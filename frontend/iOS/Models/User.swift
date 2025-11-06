import Foundation

struct User: Codable, Identifiable {
    let id: UUID
    let name: String
    let avatar: String
    let mood: String /// UX: For emotional attunement and tone mirroring
}

