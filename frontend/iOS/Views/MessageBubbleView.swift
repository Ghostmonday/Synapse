import SwiftUI

/// Message Bubble View
/// Migrated from src/components/MessageBubble.vue
/// Displays a message with support for rendered HTML/Markdown and mentions
struct MessageBubbleView: View {
    let message: Message
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Message content with AttributedString for HTML/Markdown rendering
            if let rendered = message.renderedHTML, !rendered.isEmpty {
                Text(parseHTML(rendered))
                    .font(.body)
            } else {
                Text(message.content)
                    .font(.body)
            }
        }
        .padding(12)
        .background(bubbleBackground)
        .cornerRadius(12)
    }
    
    private var bubbleBackground: Color {
        // Distinguish own messages from others
        message.senderId == getCurrentUserId() 
            ? Color.blue.opacity(0.2) 
            : Color.gray.opacity(0.2)
    }
    
    // MARK: - HTML/Markdown Parsing
    
    private func parseHTML(_ html: String) -> AttributedString {
        // Basic HTML to AttributedString conversion
        // Handles mentions styling: <span class="mention">@username</span>
        
        if let data = html.data(using: .utf8),
           let attributed = try? NSAttributedString(
               data: data,
               options: [
                   .documentType: NSAttributedString.DocumentType.html,
                   .characterEncoding: String.Encoding.utf8.rawValue
               ],
               documentAttributes: nil
           ) {
            var attributedString = AttributedString(attributed)
            
            // Apply mention styling
            if let range = attributedString.range(of: "@") {
                attributedString[range].foregroundColor = .blue
                attributedString[range].font = .body.bold()
            }
            
            return attributedString
        }
        
        return AttributedString(html)
    }
    
    private func getCurrentUserId() -> UUID {
        // TODO: Get from AuthService
        return UUID()
    }
}

#Preview {
    VStack(spacing: 12) {
        MessageBubbleView(message: Message(
            id: UUID(),
            senderId: UUID(),
            content: "Hello, this is a test message!",
            type: "text",
            timestamp: Date(),
            emotion: "neutral",
            renderedHTML: nil,
            reactions: nil
        ))
        
        MessageBubbleView(message: Message(
            id: UUID(),
            senderId: UUID(),
            content: "Message with <span class=\"mention\">@username</span>",
            type: "text",
            timestamp: Date(),
            emotion: "neutral",
            renderedHTML: "Message with <span class=\"mention\">@username</span>",
            reactions: nil
        ))
    }
    .padding()
}

