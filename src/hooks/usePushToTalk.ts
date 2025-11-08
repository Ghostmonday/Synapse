// 🔧 Upgraded: src/hooks/usePushToTalk.ts

import { ref, onMounted, onUnmounted } from 'vue';

import { healingLogger } from '../shared/logger.js';

import * as Sentry from '@sentry/browser'; // Added for error reporting

export interface PushToTalkConfig {

  activationKey?: string;

  requireModifier?: boolean;

  audioContext?: AudioContext;

}

export function usePushToTalk(config: PushToTalkConfig = {}) {

  const isActive = ref(false);

  const isEnabled = ref(false);

  const activationKey = ref(config.activationKey || 'Space');

  const requireModifier = ref(config.requireModifier ?? false);

  const onActivate = ref<(() => void) | null>(null);

  const onDeactivate = ref<(() => void) | null>(null);

  const handleKeyDown = (event: KeyboardEvent) => {

    if (!isEnabled.value) return;

    try {

      // Check if the pressed key matches our activation key

      if (event.code === activationKey.value) {

        // If requireModifier is true, check for Ctrl or Meta key

        if (requireModifier.value && !event.ctrlKey && !event.metaKey) {

          return;

        }

        if (!isActive.value) {

          isActive.value = true;

          healingLogger.info('usePushToTalk', 'Push-to-talk activated');

          onActivate.value?.();

        }

        // Prevent default behavior for the activation key

        event.preventDefault();

      }

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('usePushToTalk', `Key down handler failed: ${error.message}`);

    }

  };

  const handleKeyUp = (event: KeyboardEvent) => {

    if (!isEnabled.value) return;

    try {

      if (event.code === activationKey.value && isActive.value) {

        isActive.value = false;

        healingLogger.info('usePushToTalk', 'Push-to-talk deactivated');

        onDeactivate.value?.();

      }

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('usePushToTalk', `Key up handler failed: ${error.message}`);

    }

  };

  const handleVisibilityChange = () => {

    try {

      if (document.hidden && isActive.value) {

        // If tab becomes inactive, deactivate PTT

        isActive.value = false;

        onDeactivate.value?.();

      }

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('usePushToTalk', `Visibility change handler failed: ${error.message}`);

    }

  };

  const enable = () => {

    isEnabled.value = true;

    healingLogger.info('usePushToTalk', 'Push-to-talk enabled');

  };

  const disable = () => {

    if (isActive.value) {

      isActive.value = false;

      onDeactivate.value?.();

    }

    isEnabled.value = false;

    healingLogger.info('usePushToTalk', 'Push-to-talk disabled');

  };

  const updateConfig = (newConfig: Partial<PushToTalkConfig>) => {

    if (newConfig.activationKey) {

      activationKey.value = newConfig.activationKey;

    }

    if (newConfig.requireModifier !== undefined) {

      requireModifier.value = newConfig.requireModifier;

    }

    healingLogger.info('usePushToTalk', 'Push-to-talk config updated');

  };

  // Setup event listeners

  onMounted(() => {

    document.addEventListener('keydown', handleKeyDown);

    document.addEventListener('keyup', handleKeyUp);

    document.addEventListener('visibilitychange', handleVisibilityChange);

  });

  onUnmounted(() => {

    document.removeEventListener('keydown', handleKeyDown);

    document.removeEventListener('keyup', handleKeyUp);

    document.removeEventListener('visibilitychange', handleVisibilityChange);

   

    if (isActive.value) {

      onDeactivate.value?.();

    }

  });

  return {

    isActive,

    isEnabled,

    enable,

    disable,

    updateConfig,

    onActivate,

    onDeactivate

  };

}

