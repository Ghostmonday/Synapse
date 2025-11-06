import SwiftUI

struct ProfileView: View {
    var body: some View {
        VStack {
            Text("Avatar")
            Button("Subscribe") {
                Task { await SubscriptionManager.shared.purchaseMonthly() }
            }
        }
        /// UX: Avatar + subscription actions
    }
}

#Preview {
    ProfileView()
}

