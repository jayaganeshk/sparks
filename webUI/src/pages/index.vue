<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h6 mb-4">Photos</h1>
        
        <!-- Show refresh indicator when refreshing but data is already available -->
        <v-progress-linear
          v-if="isRefreshing"
          indeterminate
          color="primary"
          height="3"
          class="mb-3"
        ></v-progress-linear>
      </v-col>
    </v-row>
    
    <InfinitePhotoGrid
      :photos="photos"
      :loading="isLoading && !photosData"
      :error="error"
      :has-more="!!lastEvaluatedKey"
      empty-message="No photos have been uploaded yet."
      @load-more="loadMorePhotos"
    />
    
    <!-- Removed example component as it was only for demonstration -->
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch, computed } from "vue";
import InfinitePhotoGrid from "@/components/InfinitePhotoGrid.vue";
import { photosService } from "@/services";
import { useAppStore } from "@/store/app";
import { useApiCache } from "@/utils/useApiCache";

const appStore = useAppStore();
const lastEvaluatedKey = ref(null);
const error = ref(null);

// Use the API cache utility to handle data loading with caching
const { 
  data: photosData, 
  isLoading, 
  isRefreshing,
  refresh: refreshPhotos 
} = useApiCache(
  // API function to call (with cache handling)
  async (forceRefresh = false) => {
    try {
      return await photosService.getAllPhotos(null, 20, forceRefresh);
    } catch (err) {
      console.error("Error fetching photos:", err);
      error.value = "Failed to load photos. Please try again later.";
      throw err;
    }
  },
  // Dependencies that should trigger reload
  [],
  // Options
  { autoLoad: true }
);

// Computed property to extract photos array from response
const photos = computed(() => {
  if (!photosData.value) return [];
  
  // Store lastEvaluatedKey for pagination
  lastEvaluatedKey.value = photosData.value.lastEvaluatedKey || null;
  
  // Return photos array or empty array if no data
  return photosData.value.items || [];
});

const loadMorePhotos = async () => {
  if (!lastEvaluatedKey.value || isLoading.value) return;

  const isLoadingMore = ref(true);
  error.value = null;
  
  try {
    // Use photos service directly for pagination
    const response = await photosService.getAllPhotos(lastEvaluatedKey.value, 20, true);
    
    if (response && Array.isArray(response.items)) {
      // If we have a valid photos array, append it to current data
      if (photosData.value && photosData.value.items) {
        photosData.value.items.push(...response.items);
      }
      
      // Update the last evaluated key for pagination
      lastEvaluatedKey.value = response.lastEvaluatedKey || null;
      photosData.value.lastEvaluatedKey = lastEvaluatedKey.value;
    }
  } catch (err) {
    console.error("Error fetching more photos:", err);
    error.value = "Failed to load more photos. Please try again.";
  } finally {
    isLoadingMore.value = false;
  }
};

// On mount, if data is already cached, refresh in background
onMounted(() => {
  if (photosData.value) {
    // Wait a short time to ensure UI is rendered before refreshing
    setTimeout(() => refreshPhotos(true), 100);
  }
});

// Watch for photo uploads and refresh data when new photos are added
watch(
  () => appStore.lastPhotoUploadedAt,
  (newValue, oldValue) => {
    if (newValue) {
      console.log("New photo uploaded, refreshing photos...");
      refreshPhotos(true); // Force refresh from API
    }
  }
);
</script>
