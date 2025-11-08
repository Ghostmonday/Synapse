<template>
  <div class="voice-room">
    <button @click="togglePushToTalk">Push to Talk</button>
    <button @click="startScreenShare">Share Screen</button>
    <div v-if="latency">Latency: {{ latency }}ms</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Room, RoomEvent, Track } from 'livekit-client';

export default defineComponent({
  data() {
    return {
      room: null as Room | null,
      isPushToTalk: false,
      latency: 0,
    };
  },
  methods: {
    async joinRoom(roomName: string, token: string) {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      await this.room.connect('wss://your-livekit-url', token);
      this.room.on(RoomEvent.SignalQualityUpdated, this.updateLatency);
      this.room.on(RoomEvent.Disconnected, this.handleDisconnect);
    },
    togglePushToTalk() {
      this.isPushToTalk = !this.isPushToTalk;
      if (this.room?.localParticipant) {
        this.room.localParticipant.setMicrophoneEnabled(!this.isPushToTalk);
      }
    },
    async startScreenShare() {
      if (this.room?.localParticipant) {
        await this.room.localParticipant.publishTrack(await navigator.mediaDevices.getDisplayMedia({ video: true }));
      }
    },
    updateLatency() {
      this.latency = this.room?.getRoundTripTime() || 0;
      // Log to server (via API call)
      fetch('/api/voice/log-latency', { method: 'POST', body: JSON.stringify({ room: this.room?.name, latency: this.latency }) });
    },
    handleDisconnect() {
      // Cleanup
      this.room = null;
    },
  },
});
</script>

