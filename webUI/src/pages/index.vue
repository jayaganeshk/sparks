<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Photos</h1>
      </v-col>
    </v-row>

    <!-- Loading indicator -->
    <v-row v-if="loading">
      <v-col v-for="n in 8" :key="n" cols="12" sm="6" md="4" lg="3">
        <v-skeleton-loader type="card"></v-skeleton-loader>
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
      <v-col cols="12" class="text-center text-grey mt-8">
        <p>No photos have been uploaded yet.</p>
      </v-col>
    </v-row>

    <!-- Photos grid -->
    <v-row v-else>
      <v-col v-for="photo in photos" :key="photo.PK" cols="12" sm="6" md="4" lg="3">
        <PhotoCard :photo="photo" />
      </v-col>
    </v-row>

    <!-- Infinite scroll loader -->
    <v-row v-if="loadingMore" class="mt-8">
      <v-col class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import PhotoCard from '@/components/PhotoCard.vue';
import { apiService } from '@/services/api';

const photos = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(null);
const lastEvaluatedKey = ref(null);

const fetchPhotos = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await apiService.get('/photos');
    photos.value = response.data.items;
    lastEvaluatedKey.value = response.data.lastEvaluatedKey;
  } catch (err) {
    console.error('Error fetching photos:', err);
    error.value = 'Failed to load photos. Please try again later.';
  } finally {
    loading.value = false;
  }
};

const loadMorePhotos = async () => {
  if (!lastEvaluatedKey.value || loadingMore.value) return;

  loadingMore.value = true;
  try {
    const response = await apiService.get(`/photos?lastEvaluatedKey=${lastEvaluatedKey.value}`);
    photos.value.push(...response.data.items);
    lastEvaluatedKey.value = response.data.lastEvaluatedKey;
  } catch (err) {
    console.error('Error fetching more photos:', err);
    // Optionally show an error to the user
  } finally {
    loadingMore.value = false;
  }
};

const handleScroll = () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 500;
  if (nearBottom && lastEvaluatedKey.value && !loadingMore.value) {
    loadMorePhotos();
  }
};

onMounted(() => {
  fetchPhotos();
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
