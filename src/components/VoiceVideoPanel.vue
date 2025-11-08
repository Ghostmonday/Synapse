<!-- 🔧 Upgraded: src/components/VoiceVideoPanel.vue -->

<template>

  <div class="voice-video-panel" :class="{ 'is-connected': isConnected }">

    <!-- Connection Status -->

    <div class="connection-status" :class="connectionStatusClass">

      {{ connectionStatusText }}

    </div>

    <!-- Video Grid -->

    <div class="video-grid" ref="videoGrid">

      <!-- Local Video -->

      <div class="video-tile local-video" :class="{ 'video-muted': !localVideoEnabled }">

        <video

          ref="localVideo"

          muted

          autoplay

          playsinline

          @loadedmetadata="onLocalVideoLoaded"

        />

        <div class="participant-info">

          <span class="participant-name">You</span>

          <div class="audio-indicator" :class="{ 'is-speaking': isLocalSpeaking }"></div>

        </div>

        <div v-if="!localVideoEnabled" class="video-muted-overlay">

          <div class="muted-icon">📹</div>

          <span>Camera Off</span>

        </div>

      </div>

      <!-- Remote Participants -->

      <div

        v-for="participant in remoteParticipants"

        :key="participant.identity"

        class="video-tile remote-video"

        :class="{

          'video-muted': !participant.videoEnabled,

          'is-speaking': participant.isSpeaking

        }"

      >

        <video

          :ref="el => setRemoteVideoRef(participant.identity, el)"

          autoplay

          playsinline

          @loadedmetadata="onRemoteVideoLoaded(participant.identity)"

        />

        <div class="participant-info">

          <span class="participant-name">{{ participant.name || participant.identity }}</span>

          <div class="audio-indicator" :class="{ 'is-speaking': participant.isSpeaking }"></div>

        </div>

        <div v-if="!participant.videoEnabled" class="video-muted-overlay">

          <div class="muted-icon">📹</div>

          <span>Camera Off</span>

        </div>

      </div>

    </div>

    <!-- Controls -->

    <div class="controls-panel">

      <!-- Audio Control -->

      <button

        class="control-btn audio-btn"

        :class="{ 'is-muted': !localAudioEnabled, 'is-push-to-talk': pushToTalkEnabled }"

        @click="toggleAudio"

        @mousedown="onPushToTalkStart"

        @mouseup="onPushToTalkEnd"

        @touchstart="onPushToTalkStart"

        @touchend="onPushToTalkEnd"

        :disabled="!isConnected"

      >

        <span v-if="pushToTalkEnabled" class="btn-icon">🎤</span>

        <span v-else class="btn-icon">{{ localAudioEnabled ? '🎤' : '🎤❌' }}</span>

        <span class="btn-label">

          {{ pushToTalkEnabled ? 'Push to Talk' : (localAudioEnabled ? 'Mute' : 'Unmute') }}

        </span>

      </button>

      <!-- Video Control -->

      <button

        class="control-btn video-btn"

        :class="{ 'is-muted': !localVideoEnabled }"

        @click="toggleVideo"

        :disabled="!isConnected"

      >

        <span class="btn-icon">{{ localVideoEnabled ? '📹' : '📹❌' }}</span>

        <span class="btn-label">{{ localVideoEnabled ? 'Stop Video' : 'Start Video' }}</span>

      </button>

      <!-- Camera Switch -->

      <button

        class="control-btn camera-switch-btn"

        @click="switchCamera"

        :disabled="!isConnected || !localVideoEnabled"

      >

        <span class="btn-icon">🔄</span>

        <span class="btn-label">Switch Camera</span>

      </button>

      <!-- Push to Talk Toggle -->

      <button

        class="control-btn ptt-toggle-btn"

        :class="{ 'is-active': pushToTalkEnabled }"

        @click="togglePushToTalk"

        :disabled="!isConnected"

      >

        <span class="btn-icon">🎤</span>

        <span class="btn-label">PTT</span>

      </button>

      <!-- Leave Call -->

      <button

        class="control-btn leave-btn"

        @click="leaveCall"

        :class="{ 'is-connected': isConnected }"

      >

        <span class="btn-icon">📞</span>

        <span class="btn-label">{{ isConnected ? 'Leave' : 'Join' }}</span>

      </button>

    </div>

    <!-- Device Selection -->

    <div v-if="showDeviceSettings" class="device-settings">

      <h4>Audio Devices</h4>

      <select v-model="selectedAudioDevice" @change="onAudioDeviceChange">

        <option value="">Default Microphone</option>

        <option

          v-for="device in audioDevices"

          :key="device.deviceId"

          :value="device.deviceId"

        >

          {{ device.label }}

        </option>

      </select>

      <h4>Camera Devices</h4>

      <select v-model="selectedVideoDevice" @change="onVideoDeviceChange">

        <option value="">Default Camera</option>

        <option

          v-for="device in videoDevices"

          :key="device.deviceId"

          :value="device.deviceId"

        >

          {{ device.label }}

        </option>

      </select>

    </div>

    <!-- Error Display -->

    <div v-if="error" class="error-message">

      {{ error }}

      <button @click="clearError" class="error-dismiss">×</button>

    </div>

  </div>

</template>

<script setup lang="ts">

import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

import { VideoRoomManager } from '../../services/livekit/VideoRoomManager.js';

import { healingLogger } from '../../shared/logger.js';

import { usePushToTalk } from '../../hooks/usePushToTalk.ts'; // Integrated for modular PTT logic

import { useAudioPermissions } from '../../composables/useAudioPermissions.ts'; // Integrated for permission handling

import * as Sentry from '@sentry/browser'; // Added for client-side error reporting

// Props

interface Props {

  roomName: string;

  userId: string;

  userName?: string;

  initialAudio?: boolean;

  initialVideo?: boolean;

}

const props = withDefaults(defineProps<Props>(), {

  initialAudio: true,

  initialVideo: true

});

// Emits

const emit = defineEmits<{

  joined: [roomName: string];

  left: [];

  error: [error: string];

}>();

// Reactive state

const isConnected = ref(false);

const localAudioEnabled = ref(false); // Start false to defer access

const localVideoEnabled = ref(false); // Start false to defer access

const pushToTalkEnabled = ref(false);

const isLocalSpeaking = ref(false);

const error = ref('');

const showDeviceSettings = ref(false);

// Refs

const localVideo = ref<HTMLVideoElement>();

const videoGrid = ref<HTMLDivElement>();

const remoteVideoRefs = ref<Map<string, HTMLVideoElement>>(new Map());

// Room manager instance

const roomManager = new VideoRoomManager();

// Device lists

const audioDevices = ref<DeviceInfo[]>([]);

const videoDevices = ref<DeviceInfo[]>([]);

const selectedAudioDevice = ref('');

const selectedVideoDevice = ref('');

// Remote participants

const remoteParticipants = ref<any[]>([]);

// Permissions composable

const { hasMicrophonePermission, hasCameraPermission, requestMicrophonePermission, requestCameraPermission } = useAudioPermissions();

// PTT hook for keyboard support (modularized)

const { isActive: pttActive, enable: enablePTT, disable: disablePTT, onActivate, onDeactivate } = usePushToTalk({ activationKey: 'Space' });

// Link PTT hook to room manager

onActivate.value = () => roomManager.activatePushToTalk();

onDeactivate.value = () => roomManager.deactivatePushToTalk();

// Computed

const connectionStatusText = computed(() => {

  if (!isConnected.value) return 'Disconnected';

  return `Connected - ${remoteParticipants.value.length + 1} participants`;

});

const connectionStatusClass = computed(() => ({

  'status-connected': isConnected.value,

  'status-disconnected': !isConnected.value

}));

// Methods

const setRemoteVideoRef = (identity: string, el: HTMLVideoElement) => {

  if (el) {

    remoteVideoRefs.value.set(identity, el);

  }

};

const onLocalVideoLoaded = () => {

  healingLogger.info('VoiceVideoPanel', 'Local video stream loaded');

};

const onRemoteVideoLoaded = (identity: string) => {

  healingLogger.info('VoiceVideoPanel', `Remote video loaded for ${identity}`);

};

const toggleAudio = async () => {

  if (pushToTalkEnabled.value) {

    // Toggle PTT mode instead

    await togglePushToTalk();

    return;

  }

  try {

    if (!localAudioEnabled.value) {

      if (!hasMicrophonePermission.value) {

        const granted = await requestMicrophonePermission();

        if (!granted) {

          error.value = 'Microphone permission denied';

          return;

        }

      }

      await roomManager.enableAudio();

    }

    const newState = await roomManager.toggleAudio();

    localAudioEnabled.value = newState;

  } catch (err) {

    Sentry.captureException(err);

    error.value = `Failed to toggle audio: ${err.message}`;

    healingLogger.error('VoiceVideoPanel', error.value);

  }

};

const toggleVideo = async () => {

  try {

    if (!localVideoEnabled.value) {

      if (!hasCameraPermission.value) {

        const granted = await requestCameraPermission();

        if (!granted) {

          error.value = 'Camera permission denied';

          return;

        }

      }

      await roomManager.enableVideo();

    }

    const newState = await roomManager.toggleVideo();

    localVideoEnabled.value = newState;

  } catch (err) {

    Sentry.captureException(err);

    error.value = `Failed to toggle video: ${err.message}`;

    healingLogger.error('VoiceVideoPanel', error.value);

  }

};

const togglePushToTalk = async () => {

  try {

    pushToTalkEnabled.value = !pushToTalkEnabled.value;

    await roomManager.setPushToTalkMode(pushToTalkEnabled.value);

   

    if (pushToTalkEnabled.value) {

      enablePTT(); // Enable keyboard PTT

    } else {

      disablePTT(); // Disable keyboard PTT

      localAudioEnabled.value = true;

    }

  } catch (err) {

    Sentry.captureException(err);

    error.value = `Failed to toggle push-to-talk: ${err.message}`;

    healingLogger.error('VoiceVideoPanel', error.value);

  }

};

const onPushToTalkStart = async () => {

  if (pushToTalkEnabled.value) {

    await roomManager.activatePushToTalk();

    localAudioEnabled.value = true;

  }

};

const onPushToTalkEnd = async () => {

  if (pushToTalkEnabled.value) {

    await roomManager.deactivatePushToTalk();

    localAudioEnabled.value = false;

  }

};

const switchCamera = async () => {

  try {

    await roomManager.switchCamera();

  } catch (err) {

    Sentry.captureException(err);

    error.value = `Failed to switch camera: ${err.message}`;

    healingLogger.error('VoiceVideoPanel', error.value);

  }

};

const onAudioDeviceChange = async () => {

  if (selectedAudioDevice.value) {

    await roomManager.switchAudioDevice(selectedAudioDevice.value);

  }

};

const onVideoDeviceChange = async () => {

  if (selectedVideoDevice.value) {

    await roomManager.switchVideoDevice(selectedVideoDevice.value);

  }

};

const leaveCall = async () => {

  if (isConnected.value) {

    try {

      await roomManager.leaveRoom();

      isConnected.value = false;

      emit('left');

    } catch (err) {

      Sentry.captureException(err);

      error.value = `Error leaving call: ${err.message}`;

      healingLogger.error('VoiceVideoPanel', error.value);

    }

  } else {

    await joinCall();

  }

};

const joinCall = async () => {

  try {

    // Sanitize inputs

    const sanitizedRoomName = props.roomName.trim();

    const sanitizedUserId = props.userId.trim();

    const sanitizedUserName = props.userName?.trim();

    // Get token from backend

    const response = await fetch('/api/video/join', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({

        roomName: sanitizedRoomName,

        userName: sanitizedUserName

      })

    });

    if (!response.ok) {

      throw new Error('Failed to get video token');

    }

    const { token, serverUrl } = await response.json();

    await roomManager.joinRoom({

      roomName: sanitizedRoomName,

      identity: sanitizedUserId,

      token,

      audioEnabled: props.initialAudio,

      videoEnabled: props.initialVideo,

      pushToTalk: pushToTalkEnabled.value

    });

    isConnected.value = true;

    emit('joined', sanitizedRoomName);

    // Setup room event listeners

    setupRoomListeners();

   

    // Load devices

    await loadDevices();

  } catch (err) {

    Sentry.captureException(err);

    error.value = `Failed to join call: ${err.message}`;

    healingLogger.error('VoiceVideoPanel', error.value);

    emit('error', error.value);

  }

};

const setupRoomListeners = () => {

  const room = roomManager.getRoom();

 

  // TODO: Set up LiveKit room event listeners for participant changes

  // This would connect remote video tracks to video elements

  // @todo Add feature flag for advanced participant tracking

};

const loadDevices = async () => {

  try {

    audioDevices.value = await roomManager.getAudioDevices();

    videoDevices.value = await roomManager.getVideoDevices();

  } catch (err) {

    Sentry.captureException(err);

    healingLogger.error('VoiceVideoPanel', `Failed to load devices: ${err.message}`);

  }

};

const clearError = () => {

  error.value = '';

};

// Lifecycle

onMounted(async () => {

  // Auto-join if initial config suggests it

  if (props.initialAudio || props.initialVideo) {

    await joinCall();

  }

});

onUnmounted(async () => {

  if (isConnected.value) {

    await roomManager.leaveRoom();

  }

});

</script>

<style scoped>

.voice-video-panel {

  display: flex;

  flex-direction: column;

  height: 100%;

  background: #1a1a1a;

  border-radius: 12px;

  overflow: hidden;

}

.connection-status {

  padding: 8px 16px;

  font-size: 12px;

  font-weight: 500;

  text-align: center;

}

.status-connected {

  background: #10b981;

  color: white;

}

.status-disconnected {

  background: #6b7280;

  color: white;

}

.video-grid {

  flex: 1;

  display: grid;

  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));

  gap: 8px;

  padding: 16px;

  overflow: auto;

}

.video-tile {

  position: relative;

  background: #2d2d2d;

  border-radius: 8px;

  overflow: hidden;

  aspect-ratio: 16/9;

}

.video-tile video {

  width: 100%;

  height: 100%;

  object-fit: cover;

}

.video-muted .video-muted-overlay {

  display: flex;

}

.video-muted-overlay {

  display: none;

  position: absolute;

  top: 0;

  left: 0;

  right: 0;

  bottom: 0;

  background: #374151;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  color: #9ca3af;

}

.muted-icon {

  font-size: 24px;

  margin-bottom: 8px;

}

.participant-info {

  position: absolute;

  bottom: 8px;

  left: 8px;

  right: 8px;

  display: flex;

  align-items: center;

  gap: 8px;

  background: rgba(0, 0, 0, 0.7);

  padding: 4px 8px;

  border-radius: 4px;

  color: white;

  font-size: 12px;

}

.audio-indicator {

  width: 8px;

  height: 8px;

  border-radius: 50%;

  background: #ef4444;

  opacity: 0;

  transition: opacity 0.2s;

}

.audio-indicator.is-speaking {

  opacity: 1;

  animation: pulse 1s infinite;

}

@keyframes pulse {

  0%, 100% { opacity: 1; }

  50% { opacity: 0.5; }

}

.controls-panel {

  display: flex;

  gap: 8px;

  padding: 16px;

  background: #2d2d2d;

  justify-content: center;

  flex-wrap: wrap;

}

.control-btn {

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 4px;

  padding: 12px;

  background: #4b5563;

  border: none;

  border-radius: 8px;

  color: white;

  cursor: pointer;

  transition: all 0.2s;

  min-width: 80px;

}

.control-btn:hover:not(:disabled) {

  background: #6b7280;

}

.control-btn:disabled {

  opacity: 0.5;

  cursor: not-allowed;

}

.control-btn.is-muted {

  background: #ef4444;

}

.control-btn.is-push-to-talk {

  background: #f59e0b;

}

.control-btn.is-active {

  background: #10b981;

}

.leave-btn.is-connected {

  background: #ef4444;

}

.btn-icon {

  font-size: 20px;

}

.btn-label {

  font-size: 12px;

  font-weight: 500;

}

.device-settings {

  padding: 16px;

  background: #374151;

  border-top: 1px solid #4b5563;

}

.device-settings h4 {

  margin: 0 0 8px 0;

  color: white;

  font-size: 14px;

}

.device-settings select {

  width: 100%;

  padding: 8px;

  border: 1px solid #4b5563;

  border-radius: 4px;

  background: #1f2937;

  color: white;

  margin-bottom: 16px;

}

.error-message {

  position: relative;

  padding: 12px 16px;

  background: #ef4444;

  color: white;

  font-size: 14px;

}

.error-dismiss {

  position: absolute;

  right: 8px;

  top: 8px;

  background: none;

  border: none;

  color: white;

  cursor: pointer;

  font-size: 18px;

}

</style>

