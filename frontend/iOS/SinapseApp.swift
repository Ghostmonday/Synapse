import SwiftUI

@main
struct SinapseApp: App {
    @StateObject private var presenceViewModel = PresenceViewModel()
    @State private var hasOnboarded = false // Mock for onboarding status
    
    var body: some Scene {
        WindowGroup {
            if !hasOnboarded {
                LaunchView(hasOnboarded: $hasOnboarded)
            } else {
                MainTabView()
                    .environmentObject(presenceViewModel)
                    .preferredColorScheme(.dark) // Dark-mode first
                    .task {
                        // Restore IAP on launch
                        await SubscriptionManager.shared.restorePurchases()
                        // Preload services as per optimizer goals
                        Task.detached {
                            await RoomService.preload()
                            await AIService.preload()
                        }
                        // Start telemetry monitoring
                        SystemMonitor.shared.monitorTelemetry()
                    }
            }
        }
    }
}

