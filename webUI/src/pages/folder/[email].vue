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
          Back to Users
        </v-btn>
        <h1 class="text-h4 mb-4">Photos by {{ userDisplayName }}</h1>
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
        <v-alert type="info" title="No photos" text="This user hasn't uploaded any photos yet."></v-alert>
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
import { usersService } from '@/services';

const router = useRouter();
const route = useRoute();
const userEmail = computed(() => route.params.email);

// State
const userDisplayName = ref('');
const photos = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const error = ref(null);
const lastEvaluatedKey = ref(null);
const hasMorePhotos = ref(false);

// Load user photos
const loadUserPhotos = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const [userData, photosData] = await Promise.all([
      usersService.getUserByEmail(userEmail.value),
      usersService.getUserPhotos(userEmail.value)
    ]);
    
    userDisplayName.value = userData.displayName || userEmail.value;
    photos.value = photosData.items;
    lastEvaluatedKey.value = photosData.lastEvaluatedKey;
    hasMorePhotos.value = !!photosData.lastEvaluatedKey;
  } catch (err) {
    console.error('Error loading user photos:', err);
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
    const data = await usersService.getUserPhotos(userEmail.value, lastEvaluatedKey.value);
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
  loadUserPhotos();
});

// Watch for route changes to reload data
watch(() => route.params.email, (newEmail) => {
  if (newEmail) {
    loadUserPhotos();
  }
});
</script>
