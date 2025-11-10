import Foundation
import AuthenticationServices
import UIKit

@MainActor
class AppleAuthHelper: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    var isAvailable = false
    private var controller = ASAuthorizationAppleIDProvider()
    private var continuation: CheckedContinuation<ASAuthorization, Error>?
    
    override init() {
        super.init()
        checkAvailability()
    }
    
    private func checkAvailability() {
        // Check if Apple Sign In is available
        isAvailable = true
    }
    
    func signIn() async {
        isAvailable = true
        let request = controller.createRequest()
        request.requestedScopes = [.fullName, .email]
        
        let authController = ASAuthorizationController(authorizationRequests: [request])
        authController.delegate = self
        authController.presentationContextProvider = self
        
        do {
            let authorization = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<ASAuthorization, Error>) in
                self.continuation = continuation
                authController.performRequests()
            }
            
            // Authorization successful - handled in delegate
            _ = authorization
        } catch {
            print("Apple Sign In error: \(error)")
        }
    }
    
    // MARK: - ASAuthorizationControllerDelegate
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            continuation?.resume(throwing: NSError(domain: "AppleAuth", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid credential"]))
            continuation = nil
            return
        }
        
        let user = credential
        let name = user.fullName?.givenName
        let email = user.email
        
        // Send to backend Auth - inline flow, no redirects
        Task {
            do {
                // Use AuthService to handle Apple Sign In
                if let identityToken = credential.identityToken {
                    // Convert identity token to base64 string for backend
                    let tokenString = identityToken.base64EncodedString()
                    let _ = try await AuthService.loginWithApple(token: tokenString)
                    // Auth successful - token stored, OnboardingView will route to HomeView
                }
            } catch {
                // Log error but don't fail the continuation - auth was successful
                print("Apple Sign In backend error: \(error)")
            }
        }
        
        continuation?.resume(returning: authorization)
        continuation = nil
    }
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        continuation?.resume(throwing: error)
        continuation = nil
    }
    
    // MARK: - ASAuthorizationControllerPresentationContextProviding
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? UIWindow()
    }
}

