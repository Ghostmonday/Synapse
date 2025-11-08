<template>
  <span :class="status">{{ status }}</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: { userId: String },
  data() {
    return { status: 'offline' };
  },
  async mounted() {
    this.status = await fetch(`/api/presence/status/${this.userId}`).then(res => res.json()).then(d => d.status);
  },
});
</script>

