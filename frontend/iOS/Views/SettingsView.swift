import SwiftUI

/// Settings view with subscription upsell
struct SettingsView: View {
    @State private var subscriptionTier: SubscriptionTier = .starter
    @State private var showSubscriptionSheet = false
    
    var body: some View {
        NavigationStack {
            List {
                Section("Subscription") {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(subscriptionTier.displayName)
                                .font(.headline)
                            Text("Current plan")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Button("Upgrade") {
                            showSubscriptionSheet = true
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    
                    if subscriptionTier != .enterprise {
                        Text("Want permanent rooms? Go enterprise - $19/mo. Or self-host free.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Section("Account") {
                    NavigationLink("Profile", destination: ProfileView())
                }
                
                Section("Resources") {
                    NavigationLink("Hosting Guide", destination: HostingGuideView())
                    Button("Export Config") {
                        exportTerraformConfig()
                    }
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showSubscriptionSheet) {
                SubscriptionUpgradeView()
            }
        }
    }
    
    private func exportTerraformConfig() {
        // TODO: Generate and download Terraform config JSON
        print("Exporting Terraform config...")
    }
}

struct SubscriptionUpgradeView: View {
    @Environment(\.dismiss) var dismiss
    @State private var selectedTier: SubscriptionTier?
    
    var body: some View {
        NavigationStack {
            TierSelectionView(selectedTier: $selectedTier)
                .navigationTitle("Upgrade")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Cancel") {
                            dismiss()
                        }
                    }
                }
        }
    }
}

struct HostingGuideView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Self-Hosting Guide")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("Deploy Sinapse on your own infrastructure for full control and compliance.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                // Pull content from docs/SELF-HOSTING.md
                // Simplified version for mobile
                VStack(alignment: .leading, spacing: 16) {
                    GuideSection(title: "Quick Start", content: "Use our Terraform configs in infra/aws/ for one-click AWS deployment.")
                    GuideSection(title: "Docker", content: "docker-compose up -d for local testing.")
                    GuideSection(title: "Enterprise", content: "Full control, GDPR compliance, custom retention policies.")
                }
            }
            .padding()
        }
        .navigationTitle("Hosting Guide")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct GuideSection: View {
    let title: String
    let content: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            Text(content)
                .font(.body)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    SettingsView()
}

