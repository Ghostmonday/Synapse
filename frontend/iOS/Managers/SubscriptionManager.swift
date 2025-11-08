import StoreKit

/// StoreKit 2 subscription manager
@available(iOS 15.0, *)
@MainActor
class SubscriptionManager: ObservableObject {
    static let shared = SubscriptionManager()
    
    @Published var isPro: Bool = false
    @Published var subscriptionStatus: Product.SubscriptionInfo.Status?
    
    private let productId = "com.sinapse.pro.monthly"
    
    private init() {
        Task {
            await checkSubscriptionStatus()
        }
    }
    
    /// Purchase monthly subscription
    func purchaseMonthly() async {
        guard let product = try? await Product.products(for: [productId]).first else {
            print("Product not found: \(productId)")
            return
        }
        
        do {
            let result = try await product.purchase()
            
            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    await transaction.finish()
                    await checkSubscriptionStatus()
                    isPro = true
                case .unverified(_, let error):
                    print("Transaction unverified: \(error)")
                }
            case .userCancelled:
                print("User cancelled purchase")
            case .pending:
                print("Purchase pending")
            @unknown default:
                break
            }
        } catch {
            print("Purchase error: \(error)")
        }
    }
    
    /// Restore purchases on launch
    func restorePurchases() async {
        try? await AppStore.sync()
        await checkSubscriptionStatus()
    }
    
    /// Check current subscription status
    private func checkSubscriptionStatus() async {
        guard let product = try? await Product.products(for: [productId]).first,
              let subscription = product.subscription else {
            return
        }
        
        let statuses = try? await subscription.status
        guard let statuses = statuses else { return }
        
        for status in statuses {
            switch status.state {
            case .subscribed, .inGracePeriod:
                isPro = true
                subscriptionStatus = status
                return
            default:
                break
            }
        }
        
        isPro = false
    }
}

