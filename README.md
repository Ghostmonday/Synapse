# Sinapse Backend

A production-ready backend API for the Sinapse platform, providing real-time messaging, file storage, user authentication, and autonomous operations management.

## Overview

Sinapse Backend is built with Node.js, Express, TypeScript, and Supabase. It provides RESTful APIs for user management, real-time messaging via WebSockets, file storage with AWS S3, and integrated observability with Prometheus.

### Key Features

- **User Authentication**: Apple Sign-In and credential-based authentication with JWT tokens
- **Real-time Messaging**: WebSocket-based messaging with Redis pub/sub for instant message delivery
- **File Storage**: AWS S3 integration for scalable file uploads and retrieval
- **Presence System**: Track user online/offline status
- **Configuration Management**: Dynamic application configuration storage
- **Telemetry & Observability**: Prometheus metrics and structured logging
- **Autonomous Operations**: Self-healing capabilities via LLM-powered optimizer

## Architecture

### Technology Stack

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (with ES modules)
- **Database**: Supabase (PostgreSQL via REST API)
- **Cache**: Redis for pub/sub and presence tracking
- **Storage**: AWS S3 for file uploads
- **Observability**: Prometheus + Grafana
- **Authentication**: JWT + Apple Sign-In

### Project Structure

```
sinapse-backend/
├── src/
│   ├── config/              # Database and Redis configuration
│   ├── services/            # Business logic services
│   │   ├── user-authentication-service.ts
│   │   ├── message-service.ts
│   │   ├── file-storage-service.ts
│   │   ├── presence-service.ts
│   │   ├── config-service.ts
│   │   ├── optimizer-service.ts
│   │   └── telemetry-service.ts
│   ├── routes/              # Express route handlers
│   │   ├── user-authentication-routes.ts
│   │   ├── message-routes.ts
│   │   ├── file-storage-routes.ts
│   │   ├── presence-routes.ts
│   │   ├── config-routes.ts
│   │   ├── admin-routes.ts
│   │   └── telemetry-routes.ts
│   ├── server/              # Server setup and middleware
│   │   ├── middleware/      # Express middleware
│   │   └── index.ts         # Main server entry point
│   ├── shared/              # Shared utilities
│   │   ├── supabase-helpers.ts  # Database query helpers
│   │   └── logger.ts            # Logging utilities
│   ├── ws/                  # WebSocket handlers
│   ├── telemetry/           # Telemetry hooks
│   └── autonomy/            # Autonomous operations
├── scripts/                 # Utility scripts
├── sql/                     # Database schema
├── specs/                   # API specifications
├── server.js               # Entry point (for compatibility)
├── package.json
└── tsconfig.json
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Redis (local or cloud)
- AWS account with S3 bucket (optional, for file storage)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name

# LiveKit (for video calls)
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret

# Apple Sign-In
APPLE_APP_BUNDLE=com.your.app.bundle

# DeepSeek (for optimizer)
DEEPSEEK_API_KEY=your_deepseek_key
```

3. **Initialize database:**

Run the SQL schema from `sql/init-db.sql` in your Supabase SQL editor.

4. **Start the server:**

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication

- `POST /auth/apple` - Verify Apple Sign-In token
  - Body: `{ "token": "apple_id_token" }`
  - Returns: `{ "jwt": "...", "livekitToken": "..." }`

- `POST /auth/login` - Authenticate with username/password
  - Body: `{ "username": "...", "password": "..." }`
  - Returns: `{ "jwt": "..." }`

### Messaging

- `POST /messaging/send` - Send a message to a room
  - Body: `{ "roomId": "...", "senderId": "...", "content": "..." }`

- `GET /messaging/:roomId` - Get recent messages from a room
  - Returns: Array of messages

### File Storage

- `POST /files/upload` - Upload a file
  - Form-data: `file` (multipart/form-data)
  - Returns: `{ "url": "...", "id": "..." }`

- `GET /files/:id` - Get file URL by ID
  - Returns: `{ "url": "..." }`

- `DELETE /files/:id` - Delete a file

### Presence

- `GET /presence/status?userId=...` - Get user presence status
  - Returns: `{ "status": "online" | "offline" }`

- `POST /presence/update` - Update user presence
  - Body: `{ "userId": "...", "status": "..." }`

### Configuration

- `GET /config` - Get all configuration
  - Returns: Configuration object

- `PUT /config` - Update configuration
  - Body: `{ "key": "value", ... }`

### Admin

- `POST /admin/apply-recommendation` - Store optimization recommendation (requires auth)
  - Body: `{ "recommendation": {...} }`
  - Headers: `Authorization: Bearer <token>`

### Telemetry

- `POST /telemetry/log` - Log a telemetry event
  - Body: `{ "event": "event_name" }`

### System

- `GET /health` - Health check endpoint
  - Returns: `{ "status": "ok", "ts": "..." }`

- `GET /metrics` - Prometheus metrics endpoint

## Development

### Building

```bash
# TypeScript compilation
npm run build

# Output will be in dist/ directory
```

### Running Tests

```bash
# Run endpoint tests
curl http://localhost:3000/health
curl http://localhost:3000/api/test
```

### Development Scripts

- `npm run dev` - Start server in watch mode
- `npm run dev:optimizer` - Start optimizer microservice in watch mode
- `npm run build` - Compile TypeScript
- `npm start` - Start compiled server

## Docker Deployment

1. **Build and run with Docker Compose:**

```bash
docker-compose up --build
```

This starts:
- API server (port 3000)
- Redis (port 6379)
- Prometheus (port 9090)
- Optimizer microservice

2. **Access services:**

- API: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Health check: `http://localhost:3000/health`

## Database Schema

The backend uses Supabase (PostgreSQL) with the following main tables:

- `users` - User accounts
- `rooms` - Chat rooms
- `messages` - Message history
- `files` - File metadata
- `config` - Application configuration
- `recommendations` - Optimization recommendations
- `iap_receipts` - In-app purchase receipts

See `sql/init-db.sql` for the complete schema.

## Code Organization

### Services Layer

Services contain business logic and database operations. They use shared Supabase helpers for consistent query patterns.

Example service structure:
```typescript
import { findOne, create } from '../shared/supabase-helpers.js';

export async function getUserById(id: string) {
  return await findOne('users', { id });
}
```

### Routes Layer

Routes handle HTTP request/response and call appropriate services. They include telemetry hooks for observability.

### Shared Utilities

- `supabase-helpers.ts` - Reusable database query functions (findOne, findMany, create, update, delete)
- `logger.ts` - Structured logging functions

## Observability

### Prometheus Metrics

The server exposes metrics at `/metrics`:
- `http_requests_total` - Total HTTP requests
- `telemetry_events_total` - Telemetry events by type

### Logging

Logs are written to console with structured format:
- `[Sinapse INFO]` - Informational messages
- `[Sinapse ERROR]` - Error messages
- `[Sinapse WARN]` - Warnings

## Security Considerations

1. **JWT Tokens**: Use strong `JWT_SECRET` in production
2. **Supabase Service Role Key**: Keep this secret, never expose to client
3. **AWS Credentials**: Use IAM roles in production, not hardcoded keys
4. **Environment Variables**: Never commit `.env` files
5. **Rate Limiting**: Consider adding rate limiting middleware for production

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
   - Check Supabase project is active
   - Ensure database tables are initialized

2. **Redis Connection Errors**
   - Verify Redis is running: `redis-cli ping`
   - Check `REDIS_URL` matches your Redis instance

3. **File Upload Errors**
   - Verify AWS credentials are correct
   - Check S3 bucket permissions
   - Ensure bucket name is correct

## Contributing

When adding new features:

1. Create service in `src/services/` with descriptive name
2. Create routes in `src/routes/` following naming convention
3. Update this README with new endpoints
4. Add telemetry hooks for observability
5. Use shared Supabase helpers for database operations

## License

[Your License Here]



Here is a comprehensive list of all the code files and components from the optimized Sinapse iOS application build, starting from `SinapseApp.swift` and proceeding sequentially through the structure as provided. Each item includes the file or component name followed by its complete code for clarity and reference.

1. **SinapseApp.swift**
   ```swift
   import SwiftUI
   @main
   struct SinapseApp: App {
       @StateObject private var presenceViewModel = PresenceViewModel()
       @State private var hasOnboarded = false // Mock for onboarding status
       
       var body: some Scene {
           WindowGroup {
               if !hasOnboarded {
                   LaunchView(hasOnboarded: $hasOnboarded)
               } else {
                   MainTabView()
                       .environmentObject(presenceViewModel)
                       .preferredColorScheme(.dark) // Dark-mode first
                       .task {
                           // Restore IAP on launch
                           await SubscriptionManager.shared.restorePurchases()
                           // Preload services as per optimizer goals
                           Task.detached {
                               await RoomService.preload()
                               await AIService.preload()
                           }
                           // Start telemetry monitoring
                           SystemMonitor.shared.monitorTelemetry()
                       }
               }
           }
       }
   }
   ```

2. **Models/User.swift**
   ```swift
   import Foundation
   struct User: Codable, Identifiable {
       let id: UUID
       let name: String
       let avatar: String
       let mood: String /// UX: For emotional attunement and tone mirroring
   }
   ```

3. **Models/Room.swift**
   ```swift
   import Foundation
   struct Room: Codable, Identifiable {
       let id: UUID
       let users: [User]
       let maxOrbs: Int = 8 /// UX: Organic scalability limit
       let activityLevel: String /// UX: Triggers ambient feedback
   }
   ```

4. **Models/Message.swift**
   ```swift
   import Foundation
   struct Message: Codable, Identifiable {
       let id: UUID
       let senderId: UUID
       let content: String
       let type: String // "voice" or "text"
       let timestamp: Date
       let emotion: String /// UX: For resonance layers
   }
   ```

5. **Models/IAPReceipt.swift**
   ```swift
   import Foundation
   struct IAPReceipt: Codable {
       let transactionId: String
       let productId: String
       let expirationDate: Date?
   }
   ```

6. **Models/TelemetryMetric.swift**
   ```swift
   import Foundation
   struct TelemetryMetric: Codable {
       let eventType: String
       let timestamp: Date
       let data: [String: String]
   }
   ```

7. **Models/AILog.swift**
   ```swift
   import Foundation
   struct AILog: Codable {
       let query: String
       let response: String
       let latency: Double
   }
   ```

8. **ViewModels/PresenceViewModel.swift**
   ```swift
   import Foundation
   import Combine
   class PresenceViewModel: ObservableObject {
       @Published var users: [User] = []
       @Published var currentMood: String = "calm" /// UX: Emotional attunement
       
       init() {
           loadMockData()
       }
       
       private func loadMockData() {
           users = OfflineDataProvider.mockUsers()
       }
       
       func joinRoom(_ room: Room) async {
           // Mock presence post
           SystemService.logTelemetry(event: "presence.event", data: ["roomId": room.id.uuidString])
           // Deferred bootstrap of AIReasoner on first interaction, as per optimizer goals
           await AIReasoner.shared.bootstrap()
       }
   }
   ```

9. **ViewModels/RoomViewModel.swift**
   ```swift
   import Foundation
   import Combine
   class RoomViewModel: ObservableObject {
       @Published var room: Room?
       @Published var messages: [Message] = []
       @Published var isSilent: Bool = false /// UX: Silence empathy
       
       private var silenceTimer: Timer?
       
       func loadRoom(id: UUID) {
           room = OfflineDataProvider.mockRoom(id: id)
           messages = OfflineDataProvider.mockMessages(for: id)
           startSilenceDetection()
       }
       
       private func startSilenceDetection() {
           silenceTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: false) { _ in
               self.isSilent = true
               // UX: Re-engage with empathy
               Task { await AIService.reply(with: "Still here? Let's vibe.") }
           }
       }
   }
   ```

10. **ViewModels/EmotionalAIViewModel.swift**
    ```swift
    import Foundation
    class EmotionalAIViewModel: ObservableObject {
        @Published var emotion: String = "neutral"
        
        func mirrorTone(from voiceData: Data) async {
            // Mock tone analysis
            emotion = OfflineDataProvider.mockEmotion()
            // UX: Adjust pitch via AI
            SystemService.logTelemetry(event: "ai.emotion.align", data: ["emotion": emotion])
        }
        
        func echoMemory() -> String {
            // UX: Adaptive memory
            return OfflineDataProvider.mockMemoryEcho()
        }
    }
    ```

11. **Views/LaunchView.swift**
    ```swift
    import SwiftUI
    struct LaunchView: View {
        @Binding var hasOnboarded: Bool
        
        var body: some View {
            VStack {
                Text("Welcome to Sinapse")
                    .font(.system(.title, design: .rounded))
                Button("Start") {
                    hasOnboarded = true
                }
            }
            .background(MoodGradient(mood: "calm"))
            /// UX: Splash + routing
        }
    }
    #Preview {
        LaunchView(hasOnboarded: .constant(false))
    }
    ```

12. **Views/OnboardingView.swift**
    ```swift
    import SwiftUI
    struct OnboardingView: View {
        @State private var currentSlide = 0
        
        var body: some View {
            TabView(selection: $currentSlide) {
                Text("Slide 1: Intro").tag(0)
                Text("Slide 2: Permissions").tag(1)
                Text("Slide 3: Ready").tag(2)
            }
            .tabViewStyle(.page)
            /// UX: 3-slide intro + permissions
        }
    }
    #Preview {
        OnboardingView()
    }
    ```

13. **Views/VoiceView.swift**
    ```swift
    import SwiftUI
    struct VoiceView: View {
        @State private var isRecording = false
        
        var body: some View {
            VoiceOrb(isRecording: $isRecording)
                .sensoryFeedback(.impact(flexibility: .soft), trigger: isRecording)
            /// UX: Mic + waveform + transcript, hold-to-speak 0.24s
        }
    }
    #Preview {
        VoiceView()
    }
    ```

14. **Views/RoomListView.swift**
    ```swift
    import SwiftUI
    struct RoomListView: View {
        @State private var rooms: [Room] = OfflineDataProvider.mockRooms()
        
        var body: some View {
            List(rooms) { room in
                Text(room.id.uuidString)
            }
            /// UX: Doorway list
        }
    }
    #Preview {
        RoomListView()
    }
    ```

15. **Views/ChatView.swift**
    ```swift
    import SwiftUI
    struct ChatView: View {
        @StateObject private var viewModel = RoomViewModel()
        
        var body: some View {
            ZStack {
                AmbientParticles()
                List(viewModel.messages) { message in
                    Text(message.content)
                }
            }
            .background(MoodGradient(mood: viewModel.room?.activityLevel ?? "calm"))
            .task {
                viewModel.loadRoom(id: UUID())
            }
            /// UX: Voice-text thread + AI bubbles
        }
    }
    #Preview {
        ChatView()
    }
    ```

16. **Views/ProfileView.swift**
    ```swift
    import SwiftUI
    struct ProfileView: View {
        var body: some View {
            VStack {
                Text("Avatar")
                Button("Subscribe") {
                    Task { await SubscriptionManager.shared.purchaseMonthly() }
                }
            }
            /// UX: Avatar + subscription actions
        }
    }
    #Preview {
        ProfileView()
    }
    ```

17. **Views/DashboardView.swift**
    ```swift
    import SwiftUI
    struct DashboardView: View {
        var body: some View {
            Text("Metrics + AI Ops")
            // Level-3 ready with PrometheusPanels stub
        }
    }
    #Preview {
        DashboardView()
    }
    ```

18. **Views/MainTabView.swift**
    ```swift
    import SwiftUI
    struct MainTabView: View {
        var body: some View {
            TabView {
                VoiceView().tabItem { Label("Voice", systemImage: "mic") }
                RoomListView().tabItem { Label("Rooms", systemImage: "door.left.hand.open") }
                ChatView().tabItem { Label("Chat", systemImage: "bubble.left") }
                ProfileView().tabItem { Label("Profile", systemImage: "person") }
                DashboardView().tabItem { Label("Dashboard", systemImage: "chart.bar") }
            }
            /// UX: Main tab navigation
        }
    }
    #Preview {
        MainTabView()
    }
    ```

19. **Services/AuthService.swift**
    ```swift
    import Foundation
    class AuthService {
        static func login() async throws -> User {
            // Offline mock
            return OfflineDataProvider.mockUser()
        }
    }
    ```

20. **Services/RoomService.swift**
    ```swift
    import Foundation
    class RoomService {
        static func fetchRooms() async -> [Room] {
            return OfflineDataProvider.mockRooms()
        }
        
        static func createRoom() async -> Room {
            let room = OfflineDataProvider.mockRoom(id: UUID())
            SystemService.logTelemetry(event: "room.created", data: [:])
            return room
        }
        
        static func preload() async {
            // Preload mock data for rooms, as per optimizer goals
            _ = await fetchRooms()
        }
    }
    ```

21. **Services/MessageService.swift**
    ```swift
    import Foundation
    class MessageService {
        static func sendMessage(_ message: Message, to room: Room) async {
            // Mock send
            SystemService.logTelemetry(event: "message.sent", data: ["roomId": room.id.uuidString])
        }
    }
    ```

22. **Services/AIService.swift**
    ```swift
    import Foundation
    class AIService {
        static func transcribe(voiceData: Data) async -> String {
            // Mock transcription
            return "Transcribed text"
        }
        
        static func reply(with prompt: String) async -> String {
            // DeepSeek stub
            return OfflineDataProvider.mockAIResponse()
        }
        
        static func preload() async {
            // Preload AI mocks or configurations, as per optimizer goals
            _ = await reply(with: "")
        }
    }
    ```

23. **Services/IAPService.swift**
    ```swift
    import Foundation
    import StoreKit
    class IAPService {
        static func verifyReceipt(_ receipt: IAPReceipt) async {
            // Mock verification
            SystemService.logTelemetry(event: "iap.verified", data: ["transactionId": receipt.transactionId])
        }
    }
    ```

24. **Services/SystemService.swift**
    ```swift
    import Foundation
    class SystemService {
        static func logTelemetry(event: String, data: [String: String]) {
            let metric = TelemetryMetric(eventType: event, timestamp: Date(), data: data)
            // Stub logging to /telemetry/log
            print("Logged: \(metric)") // For offline simulation
        }
    }
    ```

25. **Managers/APIClient.swift**
    ```swift
    import Foundation
    class APIClient {
        static let shared = APIClient()
        
        func request(endpoint: String, method: String = "GET") async throws -> Data {
            // Offline mock for REST/WebSocket
            return Data()
        }
    }
    ```

26. **Managers/SpeechManager.swift**
    ```swift
    import AVFoundation
    class SpeechManager {
        static let shared = SpeechManager()
        
        func record() async -> Data {
            // Apple ASR wrapper mock
            return Data()
        }
    }
    ```

27. **Managers/DeepSeekClient.swift**
    ```swift
    import Foundation
    class DeepSeekClient {
        static func inferIntent(from text: String) async -> String {
            // Mock /ai/intent
            return "joinRoom"
        }
        
        static func generateReply(from text: String) async -> String {
            // Mock /ai/reply
            return OfflineDataProvider.mockAIResponse()
        }
    }
    ```

28. **Managers/RoomManager.swift**
    ```swift
    import Foundation
    class RoomManager {
        static let shared = RoomManager()
        
        func createRoom() async -> Room {
            return await RoomService.createRoom()
        }
        
        func updatePresence(in room: Room) {
            Task {
                await PresenceViewModel().joinRoom(room)
            }
        }
    }
    ```

29. **Managers/MessageManager.swift**
    ```swift
    import Foundation
    class MessageManager {
        static let shared = MessageManager()
        
        func sendVoiceMessage(data: Data, to room: Room) async {
            let transcript = await AIService.transcribe(voiceData: data)
            let message = Message(id: UUID(), senderId: UUID(), content: transcript, type: "voice", timestamp: Date(), emotion: "neutral")
            await MessageService.sendMessage(message, to: room)
        }
    }
    ```

30. **Managers/SubscriptionManager.swift**
    ```swift
    import StoreKit
    class SubscriptionManager {
        static let shared = SubscriptionManager()
        
        func purchaseMonthly() async {
            // StoreKit2 mock
        }
        
        func restorePurchases() async {
            // On launch restore
        }
    }
    ```

31. **Managers/SystemMonitor.swift**
    ```swift
    import Foundation
    class SystemMonitor {
        static let shared = SystemMonitor()
        
        private var telemetryTimer: Timer?
        
        func monitorTelemetry() {
            // Implement telemetry sampling at 0.2 Hz (every 5 seconds), as per optimizer goals
            telemetryTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { _ in
                // Collect and log system metrics periodically
                SystemService.logTelemetry(event: "system.monitor", data: ["status": "active"])
            }
        }
    }
    ```

32. **Managers/AIReasoner.swift**
    ```swift
    import Foundation
    class AIReasoner {
        static let shared = AIReasoner()
        
        private var isBootstrapped = false
        
        func reason(over input: String) async -> String {
            // DeepSeek reasoning stub for /autonomy
            return "Reasoned output"
        }
        
        func bootstrap() async {
            if !isBootstrapped {
                // Perform deferred bootstrap operations, e.g., load configurations or mocks
                isBootstrapped = true
                // Example: Preload reasoning mock
                _ = await reason(over: "")
            }
        }
    }
    ```

33. **Extensions/Color+Extensions.swift**
    ```swift
    import SwiftUI
    extension Color {
        static let primarySinapse = Color(hex: "#7C4DFF")
        static let voidBlack = Color(hex: "#0A0A0A")
        
        init(hex: String) {
            let scanner = Scanner(string: hex)
            _ = scanner.scanString("#")
            var rgb: UInt64 = 0
            scanner.scanHexInt64(&rgb)
            self.init(red: Double((rgb >> 16) & 0xFF) / 255, green: Double((rgb >> 8) & 0xFF) / 255, blue: Double(rgb & 0xFF) / 255)
        }
    }
    ```

34. **Extensions/View+Extensions.swift**
    ```swift
    import SwiftUI
    extension View {
        func ambientFeedback() -> some View {
            self.modifier(AmbientParticlesModifier())
        }
    }
    struct AmbientParticlesModifier: ViewModifier {
        func body(content: Content) -> some View {
            content.overlay(AmbientParticles())
        }
    }
    ```

35. **OfflineMock/OfflineDataProvider.swift**
    ```swift
    import Foundation
    class OfflineDataProvider {
        static func mockUsers() -> [User] {
            return [User(id: UUID(), name: "User1", avatar: "avatar1", mood: "calm")]
        }
        
        static func mockRoom(id: UUID) -> Room {
            return Room(id: id, users: mockUsers())
        }
        
        static func mockRooms() -> [Room] {
            return [mockRoom(id: UUID()), mockRoom(id: UUID())]
        }
        
        static func mockMessages(for roomId: UUID) -> [Message] {
            return [Message(id: UUID(), senderId: UUID(), content: "Hello", type: "text", timestamp: Date(), emotion: "neutral")]
        }
        
        static func mockEmotion() -> String {
            return "excited"
        }
        
        static func mockMemoryEcho() -> String {
            return "Remember our last chat?"
        }
        
        static func mockAIResponse() -> String {
            return "AI reply"
        }
        
        static func mockUser() -> User {
            return User(id: UUID(), name: "MockUser", avatar: "mock", mood: "calm")
        }
    }
    ```

36. **MoodGradient.swift** (Component from UX)
    ```swift
    import SwiftUI
    struct MoodGradient: View {
        var mood: String
        
        var body: some View {
            LinearGradient(gradient: Gradient(colors: mood == "calm" ? [Color(hex: "#2A4B7C"), Color(hex: "#4A90E2")] : [Color(hex: "#FF9500"), Color(hex: "#FFCC00")]), startPoint: .topLeading, endPoint: .bottomTrailing)
                .animation(.easeInOut(duration: 0.5), value: mood)
            /// UX: Mood-reactive gradients
        }
    }
    ```

37. **AmbientParticles.swift** (Component from UX)
    ```swift
    import SwiftUI
    struct AmbientParticles: View {
        var body: some View {
            ZStack {
                ForEach(0..<20) { _ in
                    Circle()
                        .fill(Color.white.opacity(0.1))
                        .frame(width: CGFloat.random(in: 2...8))
                        .position(x: CGFloat.random(in: 0...UIScreen.main.bounds.width), y: CGFloat.random(in: 0...UIScreen.main.bounds.height))
                        .animation(.easeInOut(duration: Double.random(in: 2...5)).repeatForever(autoreverses: true), value: UUID())
                }
            }
            /// UX: Ambient feedback particles
        }
    }
    ```

38. **VoiceOrb.swift** (Component from UX)
    ```swift
    import SwiftUI
    struct VoiceOrb: View {
        @Binding var isRecording: Bool
        
        var body: some View {
            Circle()
                .fill(RadialGradient(gradient: Gradient(colors: [.clear, .blue.opacity(0.3)]), center: .center, startRadius: 0, endRadius: 48))
                .frame(width: 96, height: 96)
                .gesture(LongPressGesture(minimumDuration: 0.24).onChanged { _ in isRecording = true }.onEnded { _ in isRecording = false })
            /// UX: Voice primacy with 0.24s threshold
        }
    }
    ```

39. **README.md**
    ```
    # Sinapse iOS Build Instructions
    1. Create new Xcode project: Single View App, SwiftUI interface.
    2. Add files to respective folders.
    3. Set deployment target to iOS 18.
    4. Add StoreKit configuration for IAP testing.
    5. Build and run; all screens functional offline via mocks.
    6. For TestFlight: Archive and upload.
    Comments mark Level-3 zones for future expansion.
    Optimizer goals integrated: Preloading in SinapseApp, telemetry sampling in SystemMonitor, deferred AIReasoner bootstrap in PresenceViewModel.
    ```


---

**For questions or support**: [Your Contact Information]
