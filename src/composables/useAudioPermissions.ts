// 🔧 Upgraded: src/composables/useAudioPermissions.ts

import { ref, onMounted } from 'vue';

import { healingLogger } from '../shared/logger.js';

import * as Sentry from '@sentry/browser'; // Added for error reporting

export interface PermissionState {

  microphone: PermissionStatus | null;

  camera: PermissionStatus | null;

}

export function useAudioPermissions() {

  const hasMicrophonePermission = ref<boolean | null>(null);

  const hasCameraPermission = ref<boolean | null>(null);

  const isRequesting = ref(false);

  const checkPermissions = async (): Promise<PermissionState> => {

    try {

      // Check microphone permission

      const microphonePermission = await navigator.permissions.query({

        name: 'microphone' as PermissionName

      });

     

      // Check camera permission

      const cameraPermission = await navigator.permissions.query({

        name: 'camera' as PermissionName

      });

      hasMicrophonePermission.value = microphonePermission.state === 'granted';

      hasCameraPermission.value = cameraPermission.state === 'granted';

      // Listen for permission changes

      microphonePermission.onchange = () => {

        hasMicrophonePermission.value = microphonePermission.state === 'granted';

        healingLogger.info('useAudioPermissions', `Microphone permission changed to: ${microphonePermission.state}`);

      };

      cameraPermission.onchange = () => {

        hasCameraPermission.value = cameraPermission.state === 'granted';

        healingLogger.info('useAudioPermissions', `Camera permission changed to: ${cameraPermission.state}`);

      };

      return {

        microphone: microphonePermission,

        camera: cameraPermission

      };

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('useAudioPermissions', `Permission check failed: ${error.message}`);

      return { microphone: null, camera: null };

    }

  };

  const requestMicrophonePermission = async (): Promise<boolean> => {

    try {

      isRequesting.value = true;

     

      const stream = await navigator.mediaDevices.getUserMedia({

        audio: true,

        video: false

      });

     

      // Stop the stream immediately since we only needed permission

      stream.getTracks().forEach(track => track.stop());

     

      hasMicrophonePermission.value = true;

      healingLogger.info('useAudioPermissions', 'Microphone permission granted');

      return true;

    } catch (error) {

      Sentry.captureException(error);

      hasMicrophonePermission.value = false;

      healingLogger.error('useAudioPermissions', `Microphone permission denied: ${error.message}`);

      return false;

    } finally {

      isRequesting.value = false;

    }

  };

  const requestCameraPermission = async (): Promise<boolean> => {

    try {

      isRequesting.value = true;

     

      const stream = await navigator.mediaDevices.getUserMedia({

        audio: false,

        video: true

      });

     

      // Stop the stream immediately since we only needed permission

      stream.getTracks().forEach(track => track.stop());

     

      hasCameraPermission.value = true;

      healingLogger.info('useAudioPermissions', 'Camera permission granted');

      return true;

    } catch (error) {

      Sentry.captureException(error);

      hasCameraPermission.value = false;

      healingLogger.error('useAudioPermissions', `Camera permission denied: ${error.message}`);

      return false;

    } finally {

      isRequesting.value = false;

    }

  };

  const requestAllPermissions = async (): Promise<{

    microphone: boolean;

    camera: boolean;

  }> => {

    try {

      isRequesting.value = true;

     

      const stream = await navigator.mediaDevices.getUserMedia({

        audio: true,

        video: true

      });

     

      // Stop the stream immediately since we only needed permission

      stream.getTracks().forEach(track => track.stop());

     

      hasMicrophonePermission.value = true;

      hasCameraPermission.value = true;

     

      healingLogger.info('useAudioPermissions', 'All media permissions granted');

      return { microphone: true, camera: true };

    } catch (error) {

      Sentry.captureException(error);

      healingLogger.error('useAudioPermissions', `Media permissions denied: ${error.message}`);

     

      // Try to determine which permission failed

      try {

        await requestMicrophonePermission();

        await requestCameraPermission();

      } catch {

        // Individual requests also failed

      }

     

      return {

        microphone: hasMicrophonePermission.value ?? false,

        camera: hasCameraPermission.value ?? false

      };

    } finally {

      isRequesting.value = false;

    }

  };

  // Check permissions on mount

  onMounted(() => {

    checkPermissions();

  });

  return {

    hasMicrophonePermission,

    hasCameraPermission,

    isRequesting,

    checkPermissions,

    requestMicrophonePermission,

    requestCameraPermission,

    requestAllPermissions

  };

}

