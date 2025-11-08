// 🔧 Upgraded: src/utils/audio/qualityEnhancer.ts

import { healingLogger } from '../../shared/logger.js';

import * as Sentry from '@sentry/browser'; // Added for client-side error reporting

export interface AudioEnhancementConfig {

  noiseSuppression: boolean;

  echoCancellation: boolean;

  autoGainControl: boolean;

  voiceActivityDetection: boolean;

  highPassFilter: boolean;

}

export class AudioQualityEnhancer {

  private audioContext: AudioContext | null = null;

  private sourceNode: MediaStreamAudioSourceNode | null = null;

  private processor: ScriptProcessorNode | null = null;

  private isInitialized: boolean = false;

  constructor(private config: AudioEnhancementConfig = {

    noiseSuppression: true,

    echoCancellation: true,

    autoGainControl: true,

    voiceActivityDetection: false, // Client-side VAD is complex, usually handled by LiveKit

    highPassFilter: true

  }) {}

  async enhanceAudioStream(stream: MediaStream): Promise<MediaStream> {

    try {

      if (!this.config.voiceActivityDetection && !this.config.highPassFilter) {

        // If no client-side processing needed, return original stream with constraints

        return this.applyBasicConstraints(stream);

      }

      return await this.withTimeout(this.setupAudioProcessing(stream), 5000); // Added timeout for resilience

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('AudioQualityEnhancer', `Audio enhancement failed: ${error.message}`);

      // Fall back to original stream

      return stream;

    }

  }

  private applyBasicConstraints(stream: MediaStream): MediaStream {

    const audioTrack = stream.getAudioTracks()[0];

    if (!audioTrack) return stream;

    // Apply basic audio constraints

    const constraints: MediaTrackConstraints = {

      noiseSuppression: this.config.noiseSuppression,

      echoCancellation: this.config.echoCancellation,

      autoGainControl: this.config.autoGainControl

    };

    audioTrack.applyConstraints(constraints).catch(error => {

      Sentry.captureException(error);

      healingLogger.warn('AudioQualityEnhancer', `Failed to apply audio constraints: ${error.message}`);

    });

    return stream;

  }

  private async setupAudioProcessing(stream: MediaStream): Promise<MediaStream> {

    this.audioContext = new AudioContext();

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);

   

    // Create destination node for processed audio

    const destination = this.audioContext.createMediaStreamDestination();

   

    // Apply high-pass filter if enabled

    if (this.config.highPassFilter) {

      const highPassFilter = this.audioContext.createBiquadFilter();

      highPassFilter.type = 'highpass';

      highPassFilter.frequency.value = 80; // Remove very low frequencies

      this.sourceNode.connect(highPassFilter);

      highPassFilter.connect(destination);

    } else {

      this.sourceNode.connect(destination);

    }

    // TODO: Implement more sophisticated VAD and noise reduction

    // This would require WebAssembly modules or complex DSP algorithms

    this.isInitialized = true;

    healingLogger.info('AudioQualityEnhancer', 'Audio processing pipeline initialized');

    return destination.stream;

  }

  // Simple voice activity detection (basic energy-based)

  setupVoiceActivityDetection(callback: (isSpeaking: boolean) => void): void {

    if (!this.audioContext || !this.sourceNode) return;

    try {

      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

     

      this.processor.onaudioprocess = (event) => {

        const inputData = event.inputBuffer.getChannelData(0);

        const energy = this.calculateEnergy(inputData);

       

        // Simple threshold-based VAD

        const isSpeaking = energy > 0.01; // Adjust threshold as needed

        callback(isSpeaking);

      };

      this.sourceNode.connect(this.processor);

      this.processor.connect(this.audioContext.destination);

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('AudioQualityEnhancer', `VAD setup failed: ${error.message}`);

    }

  }

  private calculateEnergy(samples: Float32Array): number {

    let sum = 0;

    for (let i = 0; i < samples.length; i++) {

      sum += samples[i] * samples[i];

    }

    return Math.sqrt(sum / samples.length);

  }

  updateConfig(newConfig: Partial<AudioEnhancementConfig>): void {

    this.config = { ...this.config, ...newConfig };

    healingLogger.info('AudioQualityEnhancer', 'Audio enhancement config updated');

  }

  cleanup(): void {

    if (this.processor) {

      this.processor.disconnect();

      this.processor = null;

    }

    if (this.sourceNode) {

      this.sourceNode.disconnect();

      this.sourceNode = null;

    }

    if (this.audioContext) {

      this.audioContext.close();

      this.audioContext = null;

    }

    this.isInitialized = false;

  }

  /**

   * Helper for adding timeout to promises.

   * @param promise The promise to timeout.

   * @param ms Timeout in milliseconds.

   */

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {

    return Promise.race([

      promise,

      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Operation timed out')), ms))

    ]);

  }

}

// Export singleton instance

export const audioQualityEnhancer = new AudioQualityEnhancer();

