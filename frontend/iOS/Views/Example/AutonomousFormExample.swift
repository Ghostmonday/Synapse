import SwiftUI

/// Example: Autonomous Form with Auto-Smoothing Labels
/// Demonstrates how to use autonomous components in a form
struct AutonomousFormExample: View {
    @Environment(\.autonomyCoordinator) var coordinator
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var emailError: String?
    @State private var passwordError: String?
    
    var body: some View {
        Form {
            Section {
                // Autonomous label - automatically smooths on emotional dropoff
                AutonomousLabel(
                    componentId: "email_label",
                    text: "Email Address"
                )
                
                TextField("Email", text: $email)
                    .autonomyEnabled(componentId: "email_input")
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .onChange(of: email) { newValue in
                        validateEmail(newValue)
                    }
                
                // Autonomous validation label - smooths error messages
                if let error = emailError {
                    AutonomousValidationLabel(
                        componentId: "email_validation",
                        errorText: error
                    )
                }
            }
            
            Section {
                AutonomousLabel(
                    componentId: "password_label",
                    text: "Password"
                )
                
                SecureField("Password", text: $password)
                    .autonomyEnabled(componentId: "password_input")
                    .onChange(of: password) { newValue in
                        validatePassword(newValue)
                    }
                
                if let error = passwordError {
                    AutonomousValidationLabel(
                        componentId: "password_validation",
                        errorText: error
                    )
                }
            }
            
            Section {
                Button("Submit") {
                    submitForm()
                }
                .autonomyEnabled(componentId: "submit_button")
            }
        }
        .navigationTitle("Autonomous Form")
        .onAppear {
            // Log funnel checkpoint
            UXTelemetryService.logFunnelCheckpoint(
                checkpointId: "form_started",
                metadata: [:]
            )
        }
    }
    
    private func validateEmail(_ email: String) {
        if email.isEmpty {
            emailError = nil
        } else if !email.contains("@") {
            emailError = "Invalid email format"
            UXTelemetryService.logValidationError(
                componentId: "email_input",
                errorType: "format",
                metadata: ["field": "email"]
            )
        } else {
            emailError = nil
        }
    }
    
    private func validatePassword(_ password: String) {
        if password.isEmpty {
            passwordError = nil
        } else if password.count < 8 {
            passwordError = "Password must be at least 8 characters"
            UXTelemetryService.logValidationError(
                componentId: "password_input",
                errorType: "length",
                metadata: ["field": "password", "minLength": 8]
            )
        } else {
            passwordError = nil
        }
    }
    
    private func submitForm() {
        // Log conversion if in A/B test
        if let variant = coordinator.abTestManager.getVariant(for: "submit_button") {
            coordinator.abTestManager.recordConversion(
                experimentId: "form_submission",
                variant: variant
            )
        }
        
        // Log funnel checkpoint
        UXTelemetryService.logFunnelCheckpoint(
            checkpointId: "form_submitted",
            metadata: ["email": email.isEmpty ? "empty" : "filled"]
        )
    }
}

#Preview {
    NavigationView {
        AutonomousFormExample()
            .environmentObject(AutonomyCoordinator())
    }
}

