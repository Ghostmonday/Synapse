import StoreKit

/// StoreKit 2 subscription manager with multi-tier support
@available(iOS 15.0, *)
@MainActor
class SubscriptionManager: ObservableObject {
    static let shared = SubscriptionManager()
    
    @Published var currentTier: SubscriptionTier = .starter
    @Published var isPro: Bool = false // Legacy support
    @Published var subscriptionStatus: Product.SubscriptionInfo.Status?
    
    private let productIds: [SubscriptionTier: String] = [
        .starter: "com.sinapse.starter.monthly",
        .professional: "com.sinapse.pro.monthly",
        .enterprise: "com.sinapse.enterprise.monthly"
    ]
    
    private init() {
        Task {
            await checkSubscriptionStatus()
        }
    }
    
    /// Purchase subscription for a specific tier
    func purchaseTier(_ tier: SubscriptionTier) async {
        guard let productId = productIds[tier] else {
            print("[SubscriptionManager] Product ID not found for tier: \(tier)")
            return
        }
        
        print("[SubscriptionManager] Initiating purchase for tier: \(tier.displayName) (Product ID: \(productId))")
        
        guard let product = try? await Product.products(for: [productId]).first else {
            print("[SubscriptionManager] Product not found: \(productId)")
            // Fallback: Simulate purchase for development
            await simulatePurchase(tier)
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
                    currentTier = tier
                    isPro = (tier == .professional || tier == .enterprise)
                    print("[SubscriptionManager] ✅ Purchase successful: \(tier.displayName)")
                case .unverified(_, let error):
                    print("[SubscriptionManager] ❌ Transaction unverified: \(error)")
                }
            case .userCancelled:
                print("[SubscriptionManager] ⚠️ User cancelled purchase")
            case .pending:
                print("[SubscriptionManager] ⏳ Purchase pending")
            @unknown default:
                break
            }
        } catch {
            print("[SubscriptionManager] ❌ Purchase error: \(error)")
            // Fallback: Simulate purchase for development
            await simulatePurchase(tier)
        }
    }
    
    /// Legacy method for Pro subscription
    func purchaseMonthly() async {
        await purchaseTier(.professional)
    }
    
    /// Simulate purchase for development/testing (when StoreKit products not configured)
    private func simulatePurchase(_ tier: SubscriptionTier) async {
        print("[SubscriptionManager] 🧪 Simulating purchase for development: \(tier.displayName)")
        currentTier = tier
        isPro = (tier == .professional || tier == .enterprise)
        print("[SubscriptionManager] ✅ Simulated purchase complete: \(tier.displayName)")
    }
    
    /// Restore purchases on launch
    func restorePurchases() async {
        try? await AppStore.sync()
        await checkSubscriptionStatus()
    }
    
    /// Check current subscription status
    private func checkSubscriptionStatus() async {
        // Check all tiers
        for tier in SubscriptionTier.allCases {
            guard let productId = productIds[tier],
                  let product = try? await Product.products(for: [productId]).first,
                  let subscription = product.subscription else {
                continue
            }
            
            let statuses = try? await subscription.status
            guard let statuses = statuses else { continue }
            
            for status in statuses {
                switch status.state {
                case .subscribed, .inGracePeriod:
                    currentTier = tier
                    isPro = (tier == .professional || tier == .enterprise)
                    subscriptionStatus = status
                    print("[SubscriptionManager] ✅ Active subscription: \(tier.displayName)")
                    return
                default:
                    break
                }
            }
        }
        
        // Default to starter if no active subscription
        currentTier = .starter
        isPro = false
        print("[SubscriptionManager] ℹ️ No active subscription, defaulting to Starter")
    }
    
    /// Check if user can access a feature
    func canAccess(_ feature: Feature) -> Bool {
        return FeatureGate.canAccess(feature, tier: currentTier)
    }
    
    /// Get upgrade message for a locked feature
    func upgradeMessage(for feature: Feature) -> String {
        return FeatureGate.upgradeMessage(for: feature)
    }
}

