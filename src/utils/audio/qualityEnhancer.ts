import { logError, logInfo } from '../../shared/logger.js';

export interface AudioEnhancementConfig {
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  voiceActivityDetection: boolean;
  highPassFilter: boolean;
}

export class AudioQualityEnhancer {
  private config: AudioEnhancementConfig = {
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    voiceActivityDetection: true,
    highPassFilter: true,
  };

  async enhanceAudioStream(stream: MediaStream): Promise<MediaStream> {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        await audioTrack.applyConstraints({
          noiseSuppression: this.config.noiseSuppression,
          echoCancellation: this.config.echoCancellation,
          autoGainControl: this.config.autoGainControl,
        });
      }
      logInfo('Audio enhancements applied');
      return stream;
    } catch (error: any) {
      logError('Failed to enhance audio', error);
      return stream;
    }
  }
}

export const audioQualityEnhancer = new AudioQualityEnhancer();
