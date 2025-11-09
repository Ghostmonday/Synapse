import SwiftUI

struct ChatView: View {
    @StateObject private var viewModel = RoomViewModel()
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Background gradient
                MoodGradient(mood: viewModel.room?.activityLevel ?? "calm")
                    .ignoresSafeArea()
                
                AmbientParticles()
                
                if viewModel.messages.isEmpty {
                    // Enhanced empty state
                    VStack(spacing: 24) {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.system(size: 64))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [.primarySinapse, .blue],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .shadow(color: .primarySinapse.opacity(0.3), radius: 10)
                        
                        VStack(spacing: 8) {
                            Text("No messages yet")
                                .font(.title3)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                            
                            Text("Start a conversation")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Button(action: {
                            // TODO: Show message composer
                            print("[ChatView] Start conversation tapped")
                        }) {
                            HStack {
                                Image(systemName: "plus.message.fill")
                                Text("New Message")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(
                                LinearGradient(
                                    colors: [.primarySinapse, .blue],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                            .shadow(color: .primarySinapse.opacity(0.3), radius: 8)
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .padding()
                    .transition(.opacity.combined(with: .scale))
                } else {
                    // Enhanced message list
                    List {
                        ForEach(viewModel.messages) { message in
                            MessageBubbleRow(message: message)
                                .listRowBackground(Color.clear)
                                .listRowSeparator(.hidden)
                        }
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Chat")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        // TODO: Show message composer
                        print("[ChatView] New message tapped")
                    }) {
                        Image(systemName: "plus.message.fill")
                            .foregroundColor(.primarySinapse)
                    }
                }
            }
            .animation(.spring(response: 0.4, dampingFraction: 0.8), value: viewModel.messages.isEmpty)
        }
        .task {
            // Try to load room, but don't fail silently
            viewModel.loadRoom(id: UUID())
            
            // Add dummy message if none exist after a delay
            Task {
                try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
                if viewModel.messages.isEmpty {
                    // Add dummy message for visibility
                    print("[ChatView] No messages loaded, showing empty state")
                }
            }
        }
        /// UX: Voice-text thread + AI bubbles
    }
}

/// Message Bubble Row Component
struct MessageBubbleRow: View {
    let message: Message
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Avatar placeholder
            Circle()
                .fill(
                    LinearGradient(
                        colors: [.primarySinapse.opacity(0.6), .blue.opacity(0.4)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String(message.senderId.uuidString.prefix(1).uppercased()))
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(message.content)
                    .font(.body)
                    .foregroundColor(.primary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(.ultraThinMaterial)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Color.glassBorder, lineWidth: 1)
                            )
                    )
                
                Text(formatTimestamp(message.timestamp))
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .padding(.leading, 16)
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 16)
    }
    
    private func formatTimestamp(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

#Preview {
    ChatView()
}

