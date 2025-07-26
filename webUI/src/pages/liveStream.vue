<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Live Stream</h1>
      </v-col>
    </v-row>

    <!-- Loading indicator -->
    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Error message -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" title="Error loading live stream" :text="error"></v-alert>
      </v-col>
    </v-row>

    <!-- No active livestream message -->
    <v-row v-else-if="!livestream.active">
      <v-col cols="12">
        <v-alert type="info" title="No Active Live Stream" text="There is no active live stream at the moment. Please check back later."></v-alert>
      </v-col>
    </v-row>

    <!-- Active livestream -->
    <template v-else>
      <v-row>
        <v-col cols="12">
          <v-card>
            <v-card-title>{{ livestream.title }}</v-card-title>
            <v-card-subtitle>
              {{ formatDate(livestream.startTime) }} - {{ formatDate(livestream.endTime) }}
            </v-card-subtitle>

            <v-card-text>
              <p>{{ livestream.description }}</p>
              
              <div class="video-container mt-4">
                <iframe
                  :src="livestream.streamUrl"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  class="video-iframe"
                ></iframe>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAppStore } from '@/store/app';
import { livestreamService } from '@/services';

const appStore = useAppStore();

// State
const livestream = ref({
  active: false,
  title: '',
  description: '',
  streamUrl: '',
  startTime: '',
  endTime: ''
});
const loading = ref(true);
const error = ref(null);
let refreshInterval = null;

// Format date
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Check for active livestream
const checkLivestream = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const data = await livestreamService.getLivestreamInfo();
    livestream.value = data;
  } catch (err) {
    console.error('Error checking livestream:', err);
    error.value = 'Failed to check for live stream. Please try again later.';
  } finally {
    loading.value = false;
  }
};

// Set up automatic refresh
const setupRefresh = () => {
  // Check every 5 minutes
  refreshInterval = setInterval(() => {
    checkLivestream();
  }, 5 * 60 * 1000);
};

// Clean up on component unmount
onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

// Load data on component mount
onMounted(() => {
  checkLivestream();
  setupRefresh();
});
</script>

<style scoped>
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
