<template>
  <div class="message-bubble" v-html="message.rendered_html || message.content"></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: { message: { type: Object, required: true } },
});
</script>

<style>
.mention { color: blue; }
</style>

