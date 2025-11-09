import Foundation
import SwiftUI

/// Autonomy Coordinator
/// Provides autonomy executor and related services via environment
class AutonomyCoordinator: ObservableObject {
    let executor: AutonomyExecutor
    let viewGenerator: ViewGenerator
    let abTestManager: ABTestManager
    let emotionalMonitor: EmotionalCurveMonitor
    
    init() {
        self.executor = AutonomyExecutor.shared
        self.viewGenerator = ViewGenerator()
        self.abTestManager = ABTestManager.shared
        self.emotionalMonitor = EmotionalCurveMonitor.shared
    }
}

// MARK: - Environment Key

struct AutonomyCoordinatorKey: EnvironmentKey {
    static let defaultValue = AutonomyCoordinator()
}

extension EnvironmentValues {
    var autonomyCoordinator: AutonomyCoordinator {
        get { self[AutonomyCoordinatorKey.self] }
        set { self[AutonomyCoordinatorKey.self] = newValue }
    }
}

// MARK: - View Modifier

struct AutonomyModifier: ViewModifier {
    @Environment(\.autonomyCoordinator) var coordinator
    @State private var modification: ViewModification?
    
    let componentId: String
    
    func body(content: Content) -> some View {
        content
            .onAppear {
                checkForModifications()
            }
            .onReceive(NotificationCenter.default.publisher(for: .viewModificationApplied)) { notification in
                if let mod = notification.object as? ViewModification,
                   mod.componentId == componentId {
                    modification = mod
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: .viewModificationRolledBack)) { notification in
                if let checkpoint = notification.object as? RollbackCheckpoint,
                   checkpoint.componentId == componentId {
                    modification = nil
                }
            }
            .applyModification(modification)
    }
    
    private func checkForModifications() {
        if let mod = ComponentRegistry.shared.getModification(for: componentId) {
            modification = mod
        }
    }
}

extension View {
    func autonomyEnabled(componentId: String) -> some View {
        modifier(AutonomyModifier(componentId: componentId))
    }
}

// MARK: - View Extension for Applying Modifications

extension View {
    @ViewBuilder
    func applyModification(_ modification: ViewModification?) -> some View {
        guard let modification = modification else {
            self
            return
        }
        
        switch modification.type {
        case .labelChange:
            if let label = modification.value as? String {
                self.label(label)
            } else {
                self
            }
        case .visibilityChange:
            if let visible = modification.value as? Bool {
                if visible {
                    self
                } else {
                    EmptyView()
                }
            } else {
                self
            }
        case .styleChange, .layoutChange:
            // Would apply style/layout changes
            self
        }
    }
    
    func label(_ text: String) -> some View {
        // This would be overridden by specific view types
        self
    }
}

