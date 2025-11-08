<template>
  <div class="thread">
    <div v-for="msg in messages" :key="msg.id">
      {{ msg.content }}
      <div class="reactions">
        <span v-for="rxn in msg.reactions" :key="rxn.emoji" @click="addReaction(msg.id, rxn.emoji)">
          {{ rxn.emoji }} {{ rxn.count }}
        </span>
      </div>
    </div>
    <emoji-picker @select="handleEmojiSelect"></emoji-picker>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import EmojiPicker from 'vue-emoji-picker';

export default defineComponent({
  components: { EmojiPicker },
  data() {
    return { messages: [] as any[] };
  },
  methods: {
    async loadThread(threadId: string) {
      const { data } = await fetch(`/api/threads/${threadId}`).then(res => res.json());
      this.messages = data.recent_messages || [];
    },
    async addReaction(messageId: string, emoji: string) {
      await fetch('/api/reactions', { method: 'POST', body: JSON.stringify({ message_id: messageId, emoji }) });
    },
    handleEmojiSelect(emoji: string) {
      // Apply to selected message
    },
  },
});
</script>

