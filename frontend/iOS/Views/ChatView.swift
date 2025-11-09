import SwiftUI

/// Chat view with message send and AI feedback
struct ChatView: View {
    let room: Room?
    @StateObject private var viewModel = RoomViewModel()
    @State private var input: String = ""
    @State private var showFlaggedToast = false
    @State private var flaggedSuggestion: String = ""
    @State private var haptic = UIImpactFeedbackGenerator(style: .light)
    
    init(room: Room? = nil) {
        self.room = room
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Message list
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(message: message)
                        }
                    }
                    .padding()
                }
                
                // AI feedback toast
                if showFlaggedToast {
                    HStack {
                        Text("AI: \(flaggedSuggestion)")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(.ultraThinMaterial)
                    )
                    .padding(.horizontal)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
                
                // Input area
                HStack(spacing: 12) {
                    TextField("Message...", text: $input)
                        .textFieldStyle(.roundedBorder)
                    
                    Button("Send") {
                        sendMessage()
                        haptic.impactOccurred()
                        withAnimation(.easeOut(duration: 0.4)) {
                            showFlaggedToast = false // Trigger glow animation
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color("SinapseGold"))
                    .disabled(input.isEmpty)
                    .overlay(
                        Circle()
                            .fill(Color("SinapseGlow"))
                            .frame(width: 60, height: 60)
                            .scaleEffect(input.isEmpty ? 0.01 : 0.8)
                            .opacity(input.isEmpty ? 0 : 0.3)
                            .animation(.easeOut(duration: 0.4), value: input.isEmpty)
                    )
                }
                .padding()
            }
            .navigationTitle(room?.name ?? "Chat")
            .navigationBarTitleDisplayMode(.inline)
        }
        .task {
            if let roomId = room?.id {
                viewModel.loadRoom(id: roomId)
            }
        }
    }
    
    private func sendMessage() {
        guard !input.isEmpty else { return }
        
        let messageText = input
        input = ""
        
        Task {
            do {
                // Send message via API
                guard let roomId = room?.id.uuidString else { return }
                
                // TODO: Call MessageService.sendMessage
                // Check response for moderation flags
                // If response contains flagged: true and suggestion
                // showFlaggedToast = true
                // flaggedSuggestion = response.suggestion
                
                // Simulate flagged message for demo
                if messageText.lowercased().contains("test") {
                    flaggedSuggestion = "Please keep conversations respectful"
                    withAnimation {
                        showFlaggedToast = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        withAnimation {
                            showFlaggedToast = false
                        }
                    }
                }
            } catch {
                print("Failed to send message: \(error)")
            }
        }
    }
}

struct MessageBubble: View {
    let message: Message
    
    var body: some View {
        HStack {
            Text(message.content)
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(.ultraThinMaterial)
                )
            Spacer()
        }
    }
}

#Preview {
    ChatView()
}
