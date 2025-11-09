import SwiftUI

@main
@available(iOS 17.0, *)
struct SinapseApp: App {
    @StateObject private var presenceViewModel = PresenceViewModel()
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    
    var body: some Scene {
        WindowGroup {
            if hasCompletedOnboarding {
                MainTabView()
                    .environmentObject(presenceViewModel)
                    .task {
                        // Restore IAP on launch
                        await SubscriptionManager.shared.restorePurchases()
                        // Preload services
                        Task.detached {
                            await RoomService.preload()
                            await AIService.preload()
                        }
                        // Start telemetry monitoring
                        SystemMonitor.shared.monitorTelemetry()
                    }
            } else {
                OnboardingView()
            }
        }
    }
}

