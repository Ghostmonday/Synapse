import SwiftUI

@main
@available(iOS 17.0, *)
struct SinapseApp: App {
    @StateObject private var presenceViewModel = PresenceViewModel()
    // TODO: Add AutonomyCoordinator files to Xcode project
    // @StateObject private var autonomyCoordinator = AutonomyCoordinator()
    @State private var hasOnboarded = false
    
    var body: some Scene {
        WindowGroup {
            if !hasOnboarded {
                LaunchView(hasOnboarded: $hasOnboarded)
                    // .environmentObject(autonomyCoordinator)
            } else {
                MainTabView()
                    .environmentObject(presenceViewModel)
                    // .environmentObject(autonomyCoordinator)
                    .preferredColorScheme(.dark)
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
                        // TODO: Start autonomy executor when files are added to project
                        // await autonomyCoordinator.executor.executeAutonomyCycle()
                    }
            }
        }
    }
}

