import SwiftUI

/// Bot Setup Wizard - Create and configure bots
struct BotSetupView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = BotSetupViewModel()
    @State private var currentStep = 0
    @State private var botName = ""
    @State private var selectedTemplate: BotTemplate = .welcome
    @State private var inviteToken: String?
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Progress indicator
                ProgressView(value: Double(currentStep), total: 2)
                    .progressViewStyle(.linear)
                    .tint(Color("SinapseGold"))
                    .accessibilityLabel("Step \(currentStep + 1) of 3")
                
                // Step content
                Group {
                    switch currentStep {
                    case 0:
                        templateSelectionStep
                    case 1:
                        botConfigurationStep
                    case 2:
                        inviteTokenStep
                    default:
                        EmptyView()
                    }
                }
                .transition(.slide)
                
                Spacer()
                
                // Navigation buttons
                HStack {
                    if currentStep > 0 {
                        Button("Back") {
                            withAnimation {
                                currentStep -= 1
                            }
                        }
                        .accessibleButton("Go back", hint: "Return to previous step")
                    }
                    
                    Spacer()
                    
                    if currentStep < 2 {
                        Button("Next") {
                            withAnimation {
                                currentStep += 1
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color("SinapseGold"))
                        .disabled(currentStep == 1 && botName.isEmpty)
                        .accessibleButton("Continue", hint: "Go to next step")
                    } else {
                        Button("Done") {
                            dismiss()
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Color("SinapseGold"))
                        .accessibleButton("Finish setup", hint: "Close bot setup")
                    }
                }
            }
            .padding()
            .navigationTitle("Bot Setup")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private var templateSelectionStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Choose a Template")
                .font(.title2)
                .fontWeight(.bold)
            
            ForEach(BotTemplate.allCases, id: \.self) { template in
                BotTemplateCard(
                    template: template,
                    isSelected: selectedTemplate == template
                ) {
                    selectedTemplate = template
                }
            }
        }
    }
    
    private var botConfigurationStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Configure Your Bot")
                .font(.title2)
                .fontWeight(.bold)
            
            TextField("Bot name", text: $botName)
                .textFieldStyle(.roundedBorder)
                .font(.body)
                .accessibilityLabel("Bot name")
            
            Text(selectedTemplate.description)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
    
    private var inviteTokenStep: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundColor(.green)
            
            Text("Bot Created!")
                .font(.title2)
                .fontWeight(.bold)
            
            if let token = inviteToken {
                VStack(spacing: 8) {
                    Text("Invite Token")
                        .font(.headline)
                    
                    Text(token)
                        .font(.body.monospaced())
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(8)
                        .textSelection(.enabled)
                        .accessibilityLabel("Invite token: \(token)")
                    
                    Button("Copy Token") {
                        UIPasteboard.general.string = token
                    }
                    .accessibleButton("Copy token", hint: "Double tap to copy to clipboard")
                }
            } else {
                ProgressView()
                    .onAppear {
                        createBot()
                    }
            }
        }
    }
    
    private func createBot() {
        Task {
            await viewModel.createBot(name: botName, template: selectedTemplate) { token in
                inviteToken = token
            }
        }
    }
}

/// Bot Template Card
struct BotTemplateCard: View {
    let template: BotTemplate
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: template.icon)
                    .font(.title2)
                    .foregroundColor(isSelected ? Color("SinapseGold") : .secondary)
                    .frame(width: 40)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(template.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(template.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(Color("SinapseGold"))
                }
            }
            .padding()
            .background(isSelected ? Color("SinapseGold").opacity(0.1) : Color(.secondarySystemBackground))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color("SinapseGold") : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(template.name) template")
        .accessibilityHint("Double tap to select")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// Bot Template Enum
enum BotTemplate: String, CaseIterable {
    case welcome
    case moderation
    case analytics
    
    var name: String {
        switch self {
        case .welcome: return "Welcome Bot"
        case .moderation: return "Moderation Bot"
        case .analytics: return "Analytics Bot"
        }
    }
    
    var description: String {
        switch self {
        case .welcome: return "Greets new members and provides room information"
        case .moderation: return "Automatically moderates content and enforces rules"
        case .analytics: return "Tracks room activity and provides insights"
        }
    }
    
    var icon: String {
        switch self {
        case .welcome: return "hand.wave.fill"
        case .moderation: return "shield.checkered"
        case .analytics: return "chart.bar.fill"
        }
    }
}

/// Bot Setup ViewModel
@MainActor
final class BotSetupViewModel: ObservableObject {
    func createBot(name: String, template: BotTemplate, completion: @escaping (String) -> Void) async {
        do {
            let response: BotInviteResponse = try await APIClient.shared.request(
                endpoint: "/api/bot-invites/create",
                method: "POST",
                body: [
                    "name": name,
                    "template": template.rawValue
                ]
            )
            completion(response.token)
        } catch {
            print("[BotSetup] Failed to create bot: \(error)")
        }
    }
}

struct BotInviteResponse: Codable {
    let token: String
    let botId: String
}

#Preview {
    BotSetupView()
}

