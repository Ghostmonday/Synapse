import SwiftUI

@available(iOS 15.0, *)
struct ProfileView: View {
    @StateObject private var subscriptionManager = SubscriptionManager.shared
    
    var body: some View {
        VStack(spacing: 20) {
            // Avatar placeholder
            Circle()
                .fill(Color.blue.opacity(0.3))
                .frame(width: 100, height: 100)
                .overlay(Text("Avatar").foregroundColor(.white))
            
            // Pro badge
            if subscriptionManager.isPro {
                HStack {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundColor(.blue)
                    Text("Pro Member")
                        .font(.headline)
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
            
            // Subscribe button
            if !subscriptionManager.isPro {
                Button(action: {
                    Task {
                        await subscriptionManager.purchaseMonthly()
                    }
                }) {
                    HStack {
                        Image(systemName: "crown.fill")
                        Text("Subscribe to Pro")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
            }
        }
        .padding()
        /// UX: Avatar + subscription actions
    }
}

#Preview {
    if #available(iOS 15.0, *) {
        ProfileView()
    } else {
        Text("iOS 15.0+ required")
    }
}

