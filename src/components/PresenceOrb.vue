<template>
  <div class="presence-orb" :class="status"></div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';

export default defineComponent({
  props: { userId: String, roomId: String },
  setup(props) {
    const status = ref('offline');
    onMounted(async () => {
      // WS listen for presence_update
      // Or poll /api/presence/room/:roomId
    });
    return { status };
  },
});
</script>

<style>
.presence-orb.online { background: green; }
.presence-orb.offline { background: gray; }
</style>

