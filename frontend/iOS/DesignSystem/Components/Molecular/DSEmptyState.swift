/**
 * Design System - Empty State Component
 * 
 * Consistent empty states with validation-aware messaging.
 */

import SwiftUI

struct DSEmptyState: View {
    let icon: String
    let title: String
    let message: String
    let action: EmptyStateAction?
    
    struct EmptyStateAction {
        let title: String
        let icon: String?
        let handler: () -> Void
    }
    
    init(
        icon: String,
        title: String,
        message: String,
        action: EmptyStateAction? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.action = action
    }
    
    var body: some View {
        VStack(spacing: DSSpacing.base) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.ds(.brandPrimary), .ds(.brandAccent)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: .ds(.brandPrimary).opacity(0.3), radius: 10)
            
            VStack(spacing: DSSpacing.sm) {
                Text(title)
                    .font(DSTypography.title2)
                    .foregroundColor(.ds(.textPrimary))
                    .multilineTextAlignment(.center)
                
                Text(message)
                    .font(DSTypography.body)
                    .foregroundColor(.ds(.textSecondary))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }
            
            if let action = action {
                DSPrimaryButton(action.title, icon: action.icon) {
                    action.handler()
                }
                .padding(.horizontal, DSSpacing.xl)
            }
        }
        .padding(DSSpacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Predefined Empty States

extension DSEmptyState {
    static func rooms(action: @escaping () -> Void) -> DSEmptyState {
        DSEmptyState(
            icon: "door.left.hand.open",
            title: "No rooms yet",
            message: "Create a room to start a conversation",
            action: EmptyStateAction(
                title: "Create Room",
                icon: DSIcon.plus,
                handler: action
            )
        )
    }
    
    static func messages() -> DSEmptyState {
        DSEmptyState(
            icon: "message",
            title: "Say hi",
            message: "Messages appear here"
        )
    }
    
    static func search() -> DSEmptyState {
        DSEmptyState(
            icon: DSIcon.search,
            title: "Try searching",
            message: "Search for a room name, user, or keyword"
        )
    }
    
    static func validationError(_ error: String) -> DSEmptyState {
        DSEmptyState(
            icon: DSIcon.warning,
            title: "Validation Error",
            message: error
        )
    }
}

