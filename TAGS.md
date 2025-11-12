# Feature Tag Taxonomy

This document defines the standard tags used throughout the codebase for feature mapping, validation gates, and cross-referencing.

## Feature Tags

[FEATURE: AutoNDA] - Automatic NDA acceptance and blockchain timestamping
[FEATURE: EquityScore] - Contribution scoring and equity calculation
[FEATURE: VoiceToCode] - Voice-to-code transcription and execution
[FEATURE: Paywalls] - Subscription and payment gating
[FEATURE: Charizard] - [Define based on codebase]
[FEATURE: NFTs] - NFT-related functionality
[FEATURE: ERC20] - ERC20 token operations
[FEATURE: ContributionTracker] - Track user contributions
[FEATURE: EquityDistributor] - Distribute equity based on contributions
[FEATURE: DynamicEquity] - Dynamic equity calculation
[FEATURE: SharedAPICosts] - Shared API cost tracking
[FEATURE: RoundRobinASR] - Round-robin automatic speech recognition
[FEATURE: DeptRouter] - Department/domain routing for LLM queries
[FEATURE: ContractAssist] - Contract assistance features
[FEATURE: ValuationAgnostic] - Valuation-agnostic equity distribution
[FEATURE: Governance] - Governance and decision-making features
[FEATURE: Telemetry] - Telemetry and analytics
[FEATURE: Breakthroughs] - Breakthrough tracking
[FEATURE: SessionRecording] - Session recording functionality
[FEATURE: Highlights] - Highlight extraction
[FEATURE: HallOfFame] - Hall of fame/recognition features
[FEATURE: MainCollabUI] - Main collaboration UI
[FEATURE: ProductSwipe] - Product swipe interface
[FEATURE: ContractPanels] - Contract panel UI
[FEATURE: MiniIDE] - Mini IDE features
[FEATURE: VRAR] - VR/AR features
[FEATURE: DesktopBoomMic] - Desktop boom microphone support
[FEATURE: SuccessFee] - Success fee calculation
[FEATURE: WalletAuth] - Wallet-based authentication
[FEATURE: ImmutableLog] - Immutable logging
[FEATURE: DisputePlayback] - Dispute playback functionality

## Gate & Quality Tags

[GATE] - Validation gate (tests, checks, requirements)
[SEC] - Security concern
[PRIVACY] - Privacy/data protection concern
[PERF] - Performance consideration
[RELIAB] - Reliability/resilience concern
[COMPLIANCE] - Compliance requirement
[COST] - Cost optimization concern

## Domain Tags

[API] - API endpoint
[EVENT] - Event emission/consumption
[DB] - Database operation
[CHAIN] - Blockchain/on-chain operation
[LLM] - Large language model integration
[VOICE] - Voice/audio processing
[UI] - User interface component
[GOV] - Governance logic
[EQUITY] - Equity calculation/distribution
[ROUTER] - Routing logic

## Metadata Tags

[RISK] - Risk consideration
[TODO] - TODO item
[NOTE] - Important note
[OWNER:<team|handle>] - Code ownership
[TRACE:<id>] - Trace identifier for debugging

## Usage

Tags should be used in comments to:
- Map code to features
- Indicate validation requirements
- Mark security/privacy concerns
- Cross-reference related functionality
- Enable automated discovery and documentation

Example:
```swift
// [FEATURE: Paywalls] [GATE] [SEC]
// PURPOSE: Verify subscription tier before allowing premium feature access
// GATES: [GATE] unit:test_subscription_gate; integration:paywall_flow
func checkSubscriptionAccess() -> Bool { ... }
```

