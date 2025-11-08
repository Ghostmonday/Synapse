<template>
  <input v-model="input" @keyup="handleSlash" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  data() {
    return { input: '' };
  },
  methods: {
    handleSlash() {
      if (this.input.startsWith('/')) {
        // Fetch bots, autocomplete commands
        fetch('/api/bots/commands').then(res => res.json()).then(commands => {
          // Show suggestions
        });
      }
    },
    async sendCommand() {
      await fetch('/api/bots/slash', { method: 'POST', body: JSON.stringify({ command: this.input }) });
    },
  },
});
</script>

