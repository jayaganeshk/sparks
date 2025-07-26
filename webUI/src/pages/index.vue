<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Photos</h1>
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
        <v-alert type="error" title="Error loading photos" :text="error"></v-alert>
      </v-col>
    </v-row>

    <!-- No photos message -->
    <v-row v-else-if="photos.length === 0">
      <v-col cols="12">
        <v-alert type="info" title="No photos" text="There are no photos to display. Upload some photos to get started!"></v-alert>
      </v-col>
    </v-row>

    <!-- Photos grid -->
    <v-row v-else>
      <v-col
        v-for="photo in photos"
        :key="photo.PK"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <PhotoCard :photo="photo" />
      </v-col>
    </v-row>

    <!-- Load more button -->
    <v-row v-if="hasMorePhotos && !loading">
      <v-col cols="12" class="text-center">
        <v-btn
          color="primary"
          @click="loadMorePhotos"
          :loading="loadingMore"
        >
          Load More
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import PhotoCard from '@/components/PhotoCard.vue';
import { photosService } from '@/services';

// State
const photos = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(null);
const lastEvaluatedKey = ref(null);
const hasMorePhotos = ref(false);

// Load photos from API
const loadPhotos = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const data = await photosService.getAllPhotos();
    photos.value = data.items;
    lastEvaluatedKey.value = data.lastEvaluatedKey;
    hasMorePhotos.value = !!data.lastEvaluatedKey;
  } catch (err) {
    console.error('Error loading photos:', err);
    error.value = 'Failed to load photos. Please try again later.';
  } finally {
    loading.value = false;
  }
};

// Load more photos
const loadMorePhotos = async () => {
  if (!lastEvaluatedKey.value || loadingMore.value) return;
  
  loadingMore.value = true;
  
  try {
    const data = await photosService.getAllPhotos(lastEvaluatedKey.value);
    photos.value.push(...data.items);
    lastEvaluatedKey.value = data.lastEvaluatedKey;
    hasMorePhotos.value = !!data.lastEvaluatedKey;
  } catch (err) {
    console.error('Error loading more photos:', err);
    // Show error toast or notification
  } finally {
    loadingMore.value = false;
  }
};

// Load photos on component mount
onMounted(() => {
  loadPhotos();
});
</script>
