import Foundation
import UIKit
import SwiftUI

#if canImport(GoogleSignIn)
import GoogleSignIn
#endif

@MainActor
class GoogleAuthHelper: NSObject {
    var isAvailable = false
    
    override init() {
        super.init()
        checkAvailability()
    }
    
    private func checkAvailability() {
        #if canImport(GoogleSignIn)
        // Check if Google Client ID is configured
        if let clientID = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_CLIENT_ID") as? String,
           !clientID.isEmpty {
            isAvailable = true
        } else {
            isAvailable = false
        }
        #else
        // Temporarily disabled until GoogleSignIn SDK is added
        isAvailable = false
        #endif
    }
    
    func signIn() async throws -> (idToken: String, email: String?) {
        #if canImport(GoogleSignIn)
        // Get the root view controller from the current window
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            throw NSError(domain: "GoogleAuth", code: -1, userInfo: [NSLocalizedDescriptionKey: "No presenting view controller"])
        }
        
        // Get client ID from Info.plist
        guard let clientID = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_CLIENT_ID") as? String,
              !clientID.isEmpty else {
            throw NSError(domain: "GoogleAuth", code: -1, userInfo: [NSLocalizedDescriptionKey: "Google Client ID not configured in Info.plist"])
        }
        
        // Configure Google Sign In
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        // Present Google Sign In inline - no redirects, no extra screens
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController.topMostViewController())
        
        guard let idToken = result.user.idToken?.tokenString else {
            throw NSError(domain: "GoogleAuth", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to get ID token"])
        }
        
        let email = result.user.profile?.email
        
        return (idToken: idToken, email: email)
        #else
        throw NSError(domain: "GoogleAuth", code: -1, userInfo: [NSLocalizedDescriptionKey: "GoogleSignIn SDK not available. Please add via Swift Package Manager: https://github.com/google/GoogleSignIn-iOS"])
        #endif
    }
}

extension UIViewController {
    func topMostViewController() -> UIViewController {
        if let presented = presentedViewController {
            return presented.topMostViewController()
        }
        if let navigation = self as? UINavigationController {
            return navigation.visibleViewController?.topMostViewController() ?? self
        }
        if let tab = self as? UITabBarController {
            return tab.selectedViewController?.topMostViewController() ?? self
        }
        return self
    }
}
