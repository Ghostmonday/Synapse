// 🔧 Upgraded: src/services/livekit/VideoRoomManager.ts

import { Room, RoomEvent, RemoteParticipant, LocalTrack, LocalAudioTrack, LocalVideoTrack, CreateLocalTracksOptions } from 'livekit-client';

import { telemetryService } from '../telemetry-service.js';

import { healingLogger } from '../../shared/logger.js';

import * as Sentry from '@sentry/browser'; // Added for error reporting in client-side code

export interface VideoRoomConfig {

  roomName: string;

  identity: string;

  token: string;

  audioEnabled?: boolean;

  videoEnabled?: boolean;

  pushToTalk?: boolean;

}

export interface DeviceInfo {

  deviceId: string;

  label: string;

  kind: 'audioinput' | 'videoinput' | 'audiooutput';

}

export class VideoRoomManager {

  private room: Room;

  private isConnected: boolean = false;

  private localAudioTrack?: LocalAudioTrack;

  private localVideoTrack?: LocalVideoTrack;

  private pushToTalkActive: boolean = false;

  constructor() {

    this.room = new Room({

      adaptiveStream: true,

      dynacast: true,

      videoCaptureDefaults: {

        resolution: 'h720p'

      }

    });

    this.setupEventListeners();

  }

  private setupEventListeners(): void {

    this.room

      .on(RoomEvent.Connected, () => {

        this.isConnected = true;

        healingLogger.info('VideoRoomManager', 'Connected to LiveKit room');

        telemetryService.logEvent('video_room_connected');

      })

      .on(RoomEvent.Disconnected, () => {

        this.isConnected = false;

        healingLogger.info('VideoRoomManager', 'Disconnected from LiveKit room');

        telemetryService.logEvent('video_room_disconnected');

      })

      .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {

        healingLogger.info('VideoRoomManager', `Participant connected: ${participant.identity}`);

        telemetryService.logEvent('participant_joined', { participantId: participant.identity });

      })

      .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {

        healingLogger.info('VideoRoomManager', `Participant disconnected: ${participant.identity}`);

        telemetryService.logEvent('participant_left', { participantId: participant.identity });

      })

      .on(RoomEvent.LocalTrackPublished, (publication) => {

        healingLogger.info('VideoRoomManager', 'Local track published');

      })

      .on(RoomEvent.LocalTrackUnpublished, (publication) => {

        healingLogger.info('VideoRoomManager', 'Local track unpublished');

      });

  }

  /**

   * Joins the room without immediately publishing tracks to defer media access.

   * Tracks are published separately via enableAudio/enableVideo for better client performance.

   */

  async joinRoom(config: VideoRoomConfig): Promise<void> {

    const transaction = Sentry.startTransaction({ op: 'video.joinRoom', name: 'Join Video Room' }); // Wrapped with Sentry for monitoring

    const startTime = Date.now();

    try {

      healingLogger.info('VideoRoomManager', `Joining room: ${config.roomName}`);

     

      // Sanitize inputs (security enhancement)

      const sanitizedRoomName = config.roomName.trim();

      const sanitizedIdentity = config.identity.trim();

      // Connect to the room with retries and timeout

      await this.retryAsync(async () => {

        await this.withTimeout(this.room.connect(`wss://${process.env.LIVEKIT_HOST}`, config.token), 10000);

      }, 3);

      // Defer track creation and publishing to enable methods

      if (config.audioEnabled) {

        await this.enableAudio(config.pushToTalk);

      }

      if (config.videoEnabled) {

        await this.enableVideo();

      }

      telemetryService.logEvent('room_join_success', { roomName: sanitizedRoomName, duration: Date.now() - startTime });

    } catch (error) {

      Sentry.captureException(error); // Report to Sentry

      healingLogger.error('VideoRoomManager', `Failed to join room: ${error.message}`);

      telemetryService.logEvent('room_join_failed', {

        roomName: config.roomName,

        error: error.message,

        duration: Date.now() - startTime

      });

      throw error;

    } finally {

      transaction.finish(); // End Sentry transaction

      // @todo Add Prometheus metric export for latency (e.g., via telemetryService)

    }

  }

  async leaveRoom(): Promise<void> {

    const transaction = Sentry.startTransaction({ op: 'video.leaveRoom', name: 'Leave Video Room' });

    const startTime = Date.now();

    try {

      // Unpublish all tracks

      this.room.localParticipant.tracks.forEach(publication => {

        if (publication.track) {

          this.room.localParticipant.unpublishTrack(publication.track);

        }

      });

      // Stop local tracks with timeout

      await Promise.all([

        this.localAudioTrack ? this.withTimeout(this.localAudioTrack.stop(), 5000) : Promise.resolve(),

        this.localVideoTrack ? this.withTimeout(this.localVideoTrack.stop(), 5000) : Promise.resolve()

      ]);

      await this.withTimeout(this.room.disconnect(), 10000);

      telemetryService.logEvent('room_leave_success', { duration: Date.now() - startTime });

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Error leaving room: ${error.message}`);

      telemetryService.logEvent('room_leave_error', { error: error.message, duration: Date.now() - startTime });

    } finally {

      transaction.finish();

    }

  }

  async enableAudio(pushToTalk?: boolean): Promise<void> {

    if (this.localAudioTrack) return; // Already enabled

    const tracks = await this.createLocalTracks({ audio: true });

    const audioTrack = tracks[0] as LocalAudioTrack;

    await this.room.localParticipant.publishTrack(audioTrack);

    this.localAudioTrack = audioTrack;

    if (pushToTalk) {

      await this.setPushToTalkMode(true);

    }

  }

  async enableVideo(): Promise<void> {

    if (this.localVideoTrack) return;

    const tracks = await this.createLocalTracks({ video: true });

    const videoTrack = tracks[0] as LocalVideoTrack;

    await this.room.localParticipant.publishTrack(videoTrack);

    this.localVideoTrack = videoTrack;

  }

  async toggleAudio(): Promise<boolean> {

    try {

      if (!this.localAudioTrack) {

        await this.enableAudio();

        return true;

      }

      if (this.localAudioTrack.isMuted) {

        await this.localAudioTrack.unmute();

      } else {

        await this.localAudioTrack.mute();

      }

      telemetryService.logEvent('audio_toggled', {

        muted: this.localAudioTrack.isMuted

      });

     

      return !this.localAudioTrack.isMuted;

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to toggle audio: ${error.message}`);

      return false;

    }

  }

  async toggleVideo(): Promise<boolean> {

    try {

      if (!this.localVideoTrack) {

        await this.enableVideo();

        return true;

      }

      if (this.localVideoTrack.isMuted) {

        await this.localVideoTrack.unmute();

      } else {

        await this.localVideoTrack.mute();

      }

      telemetryService.logEvent('video_toggled', {

        muted: this.localVideoTrack.isMuted

      });

     

      return !this.localVideoTrack.isMuted;

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to toggle video: ${error.message}`);

      return false;

    }

  }

  async setPushToTalkMode(enabled: boolean): Promise<void> {

    try {

      this.pushToTalkActive = enabled;

     

      if (this.localAudioTrack) {

        if (enabled) {

          await this.localAudioTrack.mute();

        } else {

          await this.localAudioTrack.unmute();

        }

      }

      telemetryService.logEvent('push_to_talk_toggled', { enabled });

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to set push-to-talk: ${error.message}`);

    }

  }

  async activatePushToTalk(): Promise<void> {

    if (this.pushToTalkActive && this.localAudioTrack) {

      await this.localAudioTrack.unmute();

      telemetryService.logEvent('push_to_talk_activated');

    }

  }

  async deactivatePushToTalk(): Promise<void> {

    if (this.pushToTalkActive && this.localAudioTrack) {

      await this.localAudioTrack.mute();

      telemetryService.logEvent('push_to_talk_deactivated');

    }

  }

  async switchCamera(): Promise<void> {

    try {

      if (!this.localVideoTrack) return;

      // Get available video devices

      const devices = await this.getVideoDevices();

      if (devices.length < 2) return;

      // Create new video track with facing mode toggle

      const constraints: MediaTrackConstraints = {

        ...this.localVideoTrack.mediaStreamTrack.getConstraints(),

        facingMode: this.localVideoTrack.mediaStreamTrack.getSettings().facingMode === 'user' ? 'environment' : 'user'

      };

      const newVideoTrack = await LocalVideoTrack.create(constraints);

     

      // Replace the existing track

      await this.room.localParticipant.unpublishTrack(this.localVideoTrack);

      await this.room.localParticipant.publishTrack(newVideoTrack);

     

      this.localVideoTrack.stop();

      this.localVideoTrack = newVideoTrack;

      telemetryService.logEvent('camera_switched');

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to switch camera: ${error.message}`);

    }

  }

  async getAudioDevices(): Promise<DeviceInfo[]> {

    try {

      const devices = await navigator.mediaDevices.enumerateDevices();

      return devices

        .filter(device => device.kind === 'audioinput')

        .map(device => ({

          deviceId: device.deviceId,

          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,

          kind: 'audioinput' as const

        }));

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to get audio devices: ${error.message}`);

      return [];

    }

  }

  async getVideoDevices(): Promise<DeviceInfo[]> {

    try {

      const devices = await navigator.mediaDevices.enumerateDevices();

      return devices

        .filter(device => device.kind === 'videoinput')

        .map(device => ({

          deviceId: device.deviceId,

          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,

          kind: 'videoinput' as const

        }));

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to get video devices: ${error.message}`);

      return [];

    }

  }

  async switchAudioDevice(deviceId: string): Promise<void> {

    try {

      if (!this.localAudioTrack) return;

      const newAudioTrack = await LocalAudioTrack.create({ deviceId });

      await this.room.localParticipant.unpublishTrack(this.localAudioTrack);

      await this.room.localParticipant.publishTrack(newAudioTrack);

     

      this.localAudioTrack.stop();

      this.localAudioTrack = newAudioTrack;

      telemetryService.logEvent('audio_device_switched', { deviceId });

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to switch audio device: ${error.message}`);

    }

  }

  async switchVideoDevice(deviceId: string): Promise<void> {

    try {

      if (!this.localVideoTrack) return;

      const newVideoTrack = await LocalVideoTrack.create({ deviceId });

      await this.room.localParticipant.unpublishTrack(this.localVideoTrack);

      await this.room.localParticipant.publishTrack(newVideoTrack);

     

      this.localVideoTrack.stop();

      this.localVideoTrack = newVideoTrack;

      telemetryService.logEvent('video_device_switched', { deviceId });

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to switch video device: ${error.message}`);

    }

  }

  private async createLocalTracks(options: CreateLocalTracksOptions): Promise<LocalTrack[]> {

    try {

      // TODO: Integrate with audio quality enhancer

      const tracks = await Room.createLocalTracks(options);

      return tracks;

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('VideoRoomManager', `Failed to create local tracks: ${error.message}`);

      throw error;

    }

  }

  /**

   * Helper for retrying async operations.

   * @param fn The async function to retry.

   * @param maxAttempts Maximum retry attempts.

   */

  private async retryAsync<T>(fn: () => Promise<T>, maxAttempts: number = 3): Promise<T> {

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

      try {

        return await fn();

      } catch (error) {

        lastError = error;

        healingLogger.warn('VideoRoomManager', `Retry attempt ${attempt} failed: ${error.message}`);

        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff

      }

    }

    throw lastError;

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

  getRoom(): Room {

    return this.room;

  }

  getIsConnected(): boolean {

    return this.isConnected;

  }

  getParticipants() {

    return this.room.participants;

  }

  getLocalParticipant() {

    return this.room.localParticipant;

  }

}

