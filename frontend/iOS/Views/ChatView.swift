import SwiftUI

struct ChatView: View {
    @StateObject private var viewModel = RoomViewModel()
    
    var body: some View {
        ZStack {
            AmbientParticles()
            List(viewModel.messages) { message in
                Text(message.content)
            }
        }
        .background(MoodGradient(mood: viewModel.room?.activityLevel ?? "calm"))
        .task {
            viewModel.loadRoom(id: UUID())
        }
        /// UX: Voice-text thread + AI bubbles
    }
}

#Preview {
    ChatView()
}

