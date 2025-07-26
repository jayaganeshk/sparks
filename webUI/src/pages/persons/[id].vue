<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-btn
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="router.back()"
          class="mb-4"
        >
          Back to People
        </v-btn>
        <h1 class="text-h4 mb-4">{{ personName }}</h1>
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
        <v-alert type="info" title="No photos" text="No photos found with this person."></v-alert>
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
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import PhotoCard from '@/components/PhotoCard.vue';
import { personsService } from '@/services';

const router = useRouter();
const route = useRoute();
const personId = computed(() => route.params.id);

// State
const personName = ref('Loading...');
const photos = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(null);
const lastEvaluatedKey = ref(null);
const hasMorePhotos = ref(false);

// Load person details and photos
const loadPersonPhotos = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const [personData, photosData] = await Promise.all([
      personsService.getPersonById(personId.value),
      personsService.getPersonPhotos(personId.value)
    ]);
    
    personName.value = personData.name || 'Unknown Person';
    photos.value = photosData.items;
    lastEvaluatedKey.value = photosData.lastEvaluatedKey;
    hasMorePhotos.value = !!photosData.lastEvaluatedKey;
  } catch (err) {
    console.error('Error loading person photos:', err);
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
    const data = await personsService.getPersonPhotos(personId.value, lastEvaluatedKey.value);
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

// Load data on component mount
onMounted(() => {
  loadPersonPhotos();
});

// Watch for route changes to reload data
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadPersonPhotos();
  }
});
</script>
