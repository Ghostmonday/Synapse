import SwiftUI

/// Poll View - Display and vote on polls
struct PollView: View {
    let poll: Poll
    @StateObject private var viewModel = PollViewModel()
    @State private var selectedOptionId: String?
    @State private var showResults = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Question
            HStack {
                Image(systemName: "chart.bar.fill")
                    .foregroundColor(Color("SinapseGold"))
                Text(poll.question)
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Poll: \(poll.question)")
            
            // Options
            ForEach(poll.options, id: \.id) { option in
                PollOptionRow(
                    option: option,
                    isSelected: selectedOptionId == option.id,
                    totalVotes: poll.totalVotes,
                    isMultipleChoice: poll.isMultipleChoice,
                    showResults: showResults || selectedOptionId != nil
                ) {
                    selectOption(option.id)
                }
            }
            
            // Footer
            HStack {
                if poll.isAnonymous {
                    Label("Anonymous", systemImage: "eye.slash.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if let expiresAt = poll.expiresAt {
                    Text("Expires \(formatDate(expiresAt))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if showResults || selectedOptionId != nil {
                    Button("Hide Results") {
                        showResults = false
                    }
                    .font(.caption)
                } else {
                    Button("Show Results") {
                        showResults = true
                    }
                    .font(.caption)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Poll: \(poll.question)")
    }
    
    private func selectOption(_ optionId: String) {
        guard selectedOptionId != optionId else { return }
        selectedOptionId = optionId
        
        Task {
            await viewModel.vote(pollId: poll.id, optionId: optionId)
        }
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

/// Poll Option Row
struct PollOptionRow: View {
    let option: PollOption
    let isSelected: Bool
    let totalVotes: Int
    let isMultipleChoice: Bool
    let showResults: Bool
    let onTap: () -> Void
    
    private var votePercentage: Double {
        guard totalVotes > 0 else { return 0 }
        return Double(option.votes) / Double(totalVotes)
    }
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    // Radio button or checkbox
                    Image(systemName: isMultipleChoice ? (isSelected ? "checkmark.square.fill" : "square") : (isSelected ? "checkmark.circle.fill" : "circle"))
                        .foregroundColor(isSelected ? Color("SinapseGold") : .secondary)
                        .font(.title3)
                    
                    Text(option.text)
                        .font(.body)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.leading)
                    
                    Spacer()
                    
                    if showResults {
                        Text("\(option.votes)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.secondary)
                    }
                }
                
                // Progress bar (when showing results)
                if showResults && totalVotes > 0 {
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.gray.opacity(0.2))
                                .frame(height: 4)
                                .cornerRadius(2)
                            
                            Rectangle()
                                .fill(Color("SinapseGold"))
                                .frame(width: geometry.size.width * votePercentage, height: 4)
                                .cornerRadius(2)
                        }
                    }
                    .frame(height: 4)
                }
            }
            .padding()
            .background(isSelected ? Color("SinapseGold").opacity(0.1) : Color.clear)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? Color("SinapseGold") : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(option.text), \(option.votes) votes")
        .accessibilityHint(showResults ? "\(Int(votePercentage * 100)) percent" : "Double tap to vote")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// Poll Creation Sheet
struct PollCreationSheet: View {
    @Environment(\.dismiss) var dismiss
    let roomId: UUID
    @StateObject private var viewModel = PollCreationViewModel()
    @State private var question = ""
    @State private var options: [String] = ["", ""]
    @State private var isAnonymous = false
    @State private var isMultipleChoice = false
    
    var body: some View {
        NavigationStack {
            Form {
                Section("Question") {
                    TextField("Enter poll question", text: $question)
                        .font(.body)
                        .accessibilityLabel("Poll question")
                }
                
                Section("Options") {
                    ForEach(options.indices, id: \.self) { index in
                        TextField("Option \(index + 1)", text: Binding(
                            get: { options[index] },
                            set: { options[index] = $0 }
                        ))
                        .font(.body)
                        .accessibilityLabel("Option \(index + 1)")
                    }
                    
                    Button("Add Option") {
                        options.append("")
                    }
                    .accessibleButton("Add option", hint: "Double tap to add another option")
                }
                
                Section("Settings") {
                    Toggle("Anonymous voting", isOn: $isAnonymous)
                        .accessibleToggle("Anonymous voting", isOn: isAnonymous, hint: "Votes will not show who voted")
                    
                    Toggle("Multiple choice", isOn: $isMultipleChoice)
                        .accessibleToggle("Multiple choice", isOn: isMultipleChoice, hint: "Allow selecting multiple options")
                }
            }
            .navigationTitle("Create Poll")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        createPoll()
                    }
                    .disabled(question.isEmpty || options.filter { !$0.isEmpty }.count < 2)
                    .accessibleButton("Create poll", hint: question.isEmpty ? "Enter a question first" : "Double tap to create")
                }
            }
        }
    }
    
    private func createPoll() {
        let validOptions = options.filter { !$0.isEmpty }
        guard !question.isEmpty, validOptions.count >= 2 else { return }
        
        Task {
            await viewModel.createPoll(
                roomId: roomId.uuidString,
                question: question,
                options: validOptions,
                isAnonymous: isAnonymous,
                isMultipleChoice: isMultipleChoice
            )
            dismiss()
        }
    }
}

/// Poll Model
struct Poll: Codable, Identifiable {
    let id: String
    let roomId: String
    let question: String
    let options: [PollOption]
    let isAnonymous: Bool
    let isMultipleChoice: Bool
    let expiresAt: Date?
    let status: String
    let totalVotes: Int
    
    enum CodingKeys: String, CodingKey {
        case id
        case roomId = "room_id"
        case question
        case options
        case isAnonymous = "is_anonymous"
        case isMultipleChoice = "is_multiple_choice"
        case expiresAt = "expires_at"
        case status
        case totalVotes = "total_votes"
    }
}

struct PollOption: Codable, Identifiable {
    let id: String
    let text: String
    let votes: Int
}

/// Poll ViewModel
@MainActor
final class PollViewModel: ObservableObject {
    func vote(pollId: String, optionId: String) async {
        do {
            try await APIClient.shared.request(
                endpoint: "/api/polls/\(pollId)/vote",
                method: "POST",
                body: ["option_id": optionId]
            )
        } catch {
            print("[PollView] Vote failed: \(error)")
        }
    }
}

/// Poll Creation ViewModel
@MainActor
final class PollCreationViewModel: ObservableObject {
    func createPoll(roomId: String, question: String, options: [String], isAnonymous: Bool, isMultipleChoice: Bool) async {
        do {
            let response: PollResponse = try await APIClient.shared.request(
                endpoint: "/api/polls",
                method: "POST",
                body: [
                    "room_id": roomId,
                    "question": question,
                    "options": options,
                    "is_anonymous": isAnonymous,
                    "is_multiple_choice": isMultipleChoice
                ]
            )
            print("[PollCreation] Poll created: \(response.poll.id)")
        } catch {
            print("[PollCreation] Failed to create poll: \(error)")
        }
    }
}

struct PollResponse: Codable {
    let poll: Poll
}

#Preview {
    PollView(poll: Poll(
        id: "1",
        roomId: "room-1",
        question: "What's your favorite feature?",
        options: [
            PollOption(id: "opt_0", text: "Search", votes: 5),
            PollOption(id: "opt_1", text: "Polls", votes: 3),
            PollOption(id: "opt_2", text: "Voice", votes: 8)
        ],
        isAnonymous: false,
        isMultipleChoice: false,
        expiresAt: nil,
        status: "active",
        totalVotes: 16
    ))
    .padding()
}

