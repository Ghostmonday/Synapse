import SwiftUI

@main
@available(iOS 17.0, *)
struct SinapseApp: App {
    @StateObject private var presenceViewModel = PresenceViewModel()
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var darkMode = false
    
    init() {
        // Global tint - golden synapse theme
        UIView.appearance().tintColor = UIColor(named: "SinapseGold") ?? UIColor(red: 0.96, green: 0.75, blue: 0.29, alpha: 1.0)
        
        // Navigation bar appearance
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = UIColor(named: "SinapseDeep") ?? UIColor(red: 0.10, green: 0.06, blue: 0.00, alpha: 1.0)
        navAppearance.titleTextAttributes = [.foregroundColor: UIColor(named: "SinapseGold") ?? UIColor(red: 0.96, green: 0.75, blue: 0.29, alpha: 1.0)]
        navAppearance.largeTitleTextAttributes = [.foregroundColor: UIColor(named: "SinapseGold") ?? UIColor(red: 0.96, green: 0.75, blue: 0.29, alpha: 1.0)]
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().compactAppearance = navAppearance
        
        // Tab bar appearance
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = UIColor(named: "SinapseDeep") ?? UIColor(red: 0.10, green: 0.06, blue: 0.00, alpha: 1.0)
        tabAppearance.selectionIndicatorTintColor = UIColor(named: "SinapseGold") ?? UIColor(red: 0.96, green: 0.75, blue: 0.29, alpha: 1.0)
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
    }
    
    var body: some Scene {
        WindowGroup {
            Group {
                if hasCompletedOnboarding {
                    MainTabView()
                        .environmentObject(presenceViewModel)
                        .task {
                            // Restore IAP on launch
                            await SubscriptionManager.shared.restorePurchases()
                            // Preload services
                            Task.detached {
                                await RoomService.preload()
                            }
                            // Start telemetry monitoring
                            SystemMonitor.shared.monitorTelemetry()
                        }
                        .transition(.opacity)
                } else {
                    OnboardingView()
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: hasCompletedOnboarding)
            .onAppear {
                darkMode = UIScreen.main.traitCollection.userInterfaceStyle == .dark
            }
            .accentColor(darkMode ? .white : .black)
            .preferredColorScheme(darkMode ? .dark : .light)
        }
    }
}

