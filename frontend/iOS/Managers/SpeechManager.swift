import AVFoundation

class SpeechManager {
    static let shared = SpeechManager()
    
    private var audioEngine: AVAudioEngine?
    
    func record() async -> Data {
        // Apple ASR wrapper - TODO: Implement actual recording
        return Data()
    }
}

